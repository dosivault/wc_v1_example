import {useState} from 'react'
import './App.css'
import WalletConnect from "@walletconnect/client";
import {SigningFinschiaClient} from "@lbmjs/finschia";
import {Secp256k1, sha256, Secp256k1Signature} from "@cosmjs/crypto";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";

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
            name: "dApp example",
            description: "Just another dApp",
            url: "https://dapp.example/com",
            icons: ["https://i.pinimg.com/600x315/93/3e/14/933e14abb0241584fd6d5a31bea1ce7b.jpg"],
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
    const [freeMsg, setFreeMsg] = useState('Any text');

    return (
        <div className="App">
            <div>
                <img src="https://i.pinimg.com/600x315/93/3e/14/933e14abb0241584fd6d5a31bea1ce7b.jpg"></img>
            </div>
            <h1>dApp Example</h1>
            WalletConnect v1 + Vault
            <div className="card">
                <div id="connect">
                    <button onClick={connectWallet}>
                        Connect
                    </button>
                </div>
                <div id="fun" style={{display: "none"}}>
                    Address: <p id="my_address"></p>

                    <div style={{borderBlock: "1px dotted"}}>
                        Message to sign : <input id="free_msg" value={freeMsg}
                                         onChange={event => setFreeMsg(event.target.value)}/>
                        <button onClick={signFreeMsg}>
                            Off-chain sign
                        </button>
                        <div>
                            Signature: <p id="Sign_free_msg"></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
