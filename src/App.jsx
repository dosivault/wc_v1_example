import {useState} from 'react'
import './App.css'
import WalletConnect from "@walletconnect/client";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";

let client;
let accountsWallet;

const CHAIN_ID = "finschia-1";

// after successful connection.
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
        console.log('on "connect"', payload);
        // Get provided accounts and chainId
        accountsWallet = await getAddress();
        WalletConnectQRCodeModal.close();
    });

    client.on("disconnect", (error, payload) => {
        console.log('on "disconnect"', payload);
    });

    client.on('session_request', (error, payload) => {
    });

    if (!client.connected) {
        await client.createSession();
    }
    WalletConnectQRCodeModal.open(client.uri);
}


async function getAddress() {
    return client.sendCustomRequest({
        id: Math.floor(Math.random() * 100000),
        method: "keplr_get_key_wallet_connect_v1",
        params: [CHAIN_ID],
    })
}

async function signFreeMsg() {
    const addresses = await getAddress();
    const address = addresses[0].bech32Address
    const freeMsg = document.getElementById("free_msg").value;
    return await client.sendCustomRequest({
        id: Math.floor(Math.random() * 100000),
        method: "keplr_sign_free_message_wallet_connect_v1",
        params: [CHAIN_ID, address, freeMsg],
    }).then(async (data) => {
        dataSignFreeMessage = data;
        console.log(dataSignFreeMessage)
        return data;
    })
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
