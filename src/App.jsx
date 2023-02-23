import {useState} from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import WalletConnect from "@walletconnect/client";
import {SigningFinschiaClient} from "@lbmjs/finschia";
import {OfflineDirectSigner} from "@cosmjs/proto-signing";
import {Secp256k1, sha256, Secp256k1Signature} from "@cosmjs/crypto";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import {Buffer} from "buffer/";

const cosmos = await SigningFinschiaClient.connectWithSigner("https://dsvt-finschia-api.line-apps-beta.com", OfflineDirectSigner)

let client;
let accountsWallet;

let chainId = "finschia-1";

// after successful connection.
let dataSignTransaction;
let dataSignFreeMessage;

async function connectWallet() {
    client = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        clientMeta: {
            name: "Bithumb",
            description: "Blockchain Wallet for All - DOSI Vault",
            url: "https://www.bithumb.com",
            icons: ["https://play-lh.googleusercontent.com/_gGIl1OGnFwwfFtTej3wtt-J-2oyz-XkQAyhVWho7mJffyZV_J4DYhXhyyYxB7oMEx-q=s96-rw"],
        },
    });

    client.on("connect", async (error, payload) => {
        if (error) {
            throw error;
        }
        // Get provided accounts and chainId
        accountsWallet = await getAddress()
        WalletConnectQRCodeModal.close();
    });

    client.on('session_request', (error, payload) => {
    });

    if (!client.connected) {
        await client.createSession();
    }
    WalletConnectQRCodeModal.open(client.uri);
}


async function getAddress() {
    return await client.sendCustomRequest({
        id: Math.floor(Math.random() * 100000),
        method: "keplr_get_key_wallet_connect_v1",
        params: [chainId],
    }).then((data) => {
        return data;
    })
}

async function getBalance(address, denom) {
    return await cosmos.getBalance(address, denom)
}

async function cosmosSignAmino(address, stdSignDoc) {
    return await client.sendCustomRequest({
        id: Math.floor(Math.random() * 100000),
        method: "keplr_sign_amino_wallet_connect_v1",
        params: [chainId, address, stdSignDoc, {}]
    }).then((data) => {
        console.log(data)
        return data;
    })
}

async function signFreeMsg() {
    const addresses = await getAddress();
    const address = addresses[0].bech32Address
    const freeMsg = document.getElementById("free_msg").value;
    return await client.sendCustomRequest({
        id: Math.floor(Math.random() * 100000),
        method: "keplr_sign_free_message_wallet_connect_v1",
        params: [chainId, address, freeMsg],
    }).then(async (data) => {
        dataSignFreeMessage = data;
        console.log(dataSignFreeMessage)
        return data;
    })
}

async function verifySignFreeMsg() {
    const addresses = await getAddress();
    const address = addresses[0].bech32Address
    const freeMsg = document.getElementById("free_msg").value;
    const freeMsgBuffer = btoa(freeMsg);
    const signDoc = {
        chain_id: "",
        account_number: "0",
        sequence: "0",
        fee: {
            gas: "0",
            amount: [],
        },
        msgs: [
            {
                type: "sign/MsgSignData",
                value: {
                    signer: address,
                    data: freeMsgBuffer,
                },
            },
        ],
        memo: "",
    }
    const signatureBuffer = Buffer.from(dataSignFreeMessage[0].signature, "base64")

    const messageHash = sha256(Buffer.from(Buffer.from(sortedJsonByKeyStringify(signDoc)), "utf8"));
    console.log(Buffer.from(messageHash))

    const pubKeyBuffer = Buffer.from(dataSignFreeMessage[0].pub_key.value, "base64");

    const signature = Secp256k1Signature.fromFixedLength(signatureBuffer)
    const verifySignature = await Secp256k1.verifySignature(signature, messageHash, pubKeyBuffer)
    document.getElementById("verify_free_msg").textContent = verifySignature;


}

export function sortObjectByKey(obj) {
    if (typeof obj !== "object" || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObjectByKey);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    sortedKeys.forEach((key) => {
        result[key] = sortObjectByKey(obj[key]);
    });
    return result;
}

export function sortedJsonByKeyStringify(obj) {
    return JSON.stringify(sortObjectByKey(obj));
}

async function signTransaction() {
    const addresses = await getAddress();
    const address = addresses[0].bech32Address
    const amountFinal = [
        {
            amount: (0.01).toString(),
            denom: "cony",
        }
    ];

    // fixed value: 100K units, each unit is 1 minimal token denom
    const fee = {
        amount: [
            {
                denom: "cony",
                amount: "1",
            },
        ],
        gas: '100000',
    };

    const sendMsg = {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
            fromAddress: address,
            toAddress: address,
            amount: [...amountFinal],
        },
    };

    const data = await cosmos.getAccount(address);

    console.log(data)

    var stdSignDoc = {
        chain_id: chainId,
        account_number: data.accountNumber.toString(),
        sequence: (await cosmos.getSequence(address)).sequence.toString(),
        fee: fee,
        msgs: [
            sendMsg
        ],
        memo: document.getElementById("memo").value
    }

    dataSignTransaction = await cosmosSignAmino(address, stdSignDoc);
    console.log(dataSignTransaction)

}

setInterval(async function () {
    try {
        if (!accountsWallet) {
            return;
        }
        if (!client) {
            document.getElementById("connect").style.display = 'block';
            document.getElementById("fun").style.display = 'none';
        }
        const addresses = accountsWallet;
        if (addresses.length > 0) {
            document.getElementById("connect").style.display = 'none';
            document.getElementById("fun").style.display = 'block';
            document.getElementById("my_address").textContent = addresses[0].bech32Address;

            // const balance = await getBalance(addresses[0].bech32Address, denom);
            // document.getElementById("balance").textContent = (Number(balance.amount) / (10 ** 6));
        }
        if (dataSignTransaction) {
            document.getElementById("Sign_msg_transaction").textContent = dataSignTransaction[0].signature.signature;
            document.getElementById("Pub_key_transaction").textContent = dataSignTransaction[0].signature.pub_key.value;
        }

        if (dataSignFreeMessage) {
            document.getElementById("Sign_free_msg").textContent = dataSignFreeMessage[0].signature;
            document.getElementById("Pub_free_msg").textContent = dataSignFreeMessage[0].pub_key.value;
        }

    } catch (e) {
    }
}, 2000);

function App() {
    const [memo, setMemo] = useState('memo wc2 demo');
    const [freeMsg, setFreeMsg] = useState('DOSI VAULT');

    return (
        <div className="App">
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    <img src="/vite.svg" className="logo" alt="Vite logo"/>
                </a>
                <a href="https://reactjs.org" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo"/>
                </a>
            </div>
            <h1>For dosi vault test</h1>
            <div className="card">
                <div id="connect">
                    <button onClick={connectWallet}>
                        Connect
                    </button>
                </div>
                <div id="fun" style={{display: "none"}}>
                    Address: <p id="my_address"></p>

                    Balance: <p id="balance"></p>


                    <div style={{borderBlock: "1px dotted"}}>
                        Memo: <input id="memo" value={memo}
                                     onChange={event => setMemo(event.target.value)}/>
                        <button onClick={signTransaction}>
                            Sign transaction
                        </button>
                        <div>
                            Signature: <p id="Sign_msg_transaction"></p>
                            Pub key: <p id="Pub_key_transaction"></p>
                        </div>
                    </div>
                    <div style={{borderBlock: "1px dotted"}}>
                        Free Msg: <input id="free_msg" value={freeMsg}
                                         onChange={event => setFreeMsg(event.target.value)}/>
                        <button onClick={signFreeMsg}>
                            Sign free msg
                        </button>
                        <div>
                            Signature: <p id="Sign_free_msg"></p>
                            Pub key: <p id="Pub_free_msg"></p>
                            Verify result: <span id="verify_free_msg">Null</span>
                            <button onClick={verifySignFreeMsg}>
                                Verify Signature
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <p className="read-the-docs">
                Create by tvd12
            </p>
        </div>
    )
}

export default App
