import {useState} from 'react'
import './App.css'
import WalletConnect from "@walletconnect/client";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";

const CHAIN_ID = "finschia-1";

function App() {
    const [sessionConnected, setSessionConnected] = useState(false);
    const [address, setAddress] = useState(null);
    const [msgToSign, setMsgToSign] = useState('Any text');
    const [signature, setSignature] = useState(null);
    
    const client = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        clientMeta: {
            name: "dApp example",
            description: "Just another dApp",
            url: "https://dapp.example/com",
            icons: ["https://i.pinimg.com/600x315/93/3e/14/933e14abb0241584fd6d5a31bea1ce7b.jpg"],
        },
    });

    async function connectWallet() {    
        client.on("connect", async (error, payload) => {
            if (error) {
                setSessionConnected(false);
                throw error;
            }
            WalletConnectQRCodeModal.close();
            setSessionConnected(true);
            // no useful information in 'payload' since WalletConnect v1 is only for EVM-compatible chains
            // https://github.com/chainapsis/keplr-wallet/blob/master/packages/mobile/src/stores/wallet-connect/index.ts#L42
            console.log('on "connect"', payload);
            const addrFromVault = await fetchAddress();
            setAddress(addrFromVault);
        });
    
        client.on("disconnect", (error, payload) => {
            setSessionConnected(false);
            setAddress(null);
        });

        if (!client.connected) {
            await client.createSession();
        }
        WalletConnectQRCodeModal.open(client.uri);
    }

    async function fetchAddress() {
        // Keplr returns only an active address despite it's in a form of an array
        const accounts = await client.sendCustomRequest({
            id: Math.floor(Math.random() * 100000),
            method: "keplr_get_key_wallet_connect_v1",
            params: [CHAIN_ID],
        });
        return accounts[0].bech32Address;
    }

    async function handleSignArbitraryMsg() {
        const [resp] = await client.sendCustomRequest({
            id: Math.floor(Math.random() * 100000),
            method: "keplr_sign_free_message_wallet_connect_v1",
            params: [CHAIN_ID, address, msgToSign],
        });
        setSignature(resp.signature);
    }

    return (
        <div className="App" style={{ backgroundColor: sessionConnected ? 'yellow' : 'white' }}>
            <div>
                <img src="https://i.pinimg.com/600x315/93/3e/14/933e14abb0241584fd6d5a31bea1ce7b.jpg"></img>
            </div>
            <h1>dApp Example</h1>
            WalletConnect v1 + Vault
            <div className="card">
                <div hidden={!!address}>
                    <button onClick={connectWallet}>
                        Connect
                    </button>
                </div>
                <div hidden={!address}>
                    Address: {address}

                    <div style={{borderBlock: "1px dotted"}}>
                        Message to sign :
                        <input value={msgToSign} onChange={e => setMsgToSign(e.target.value)}/>
                        <button onClick={handleSignArbitraryMsg}>
                            Off-chain sign
                        </button>
                        <div>
                            Signature: <p>{signature}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
