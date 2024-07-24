import Head from "next/head";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { useState, useEffect } from "react";
import { BlockfrostProvider, MeshTxBuilder, resolvePaymentKeyHash } from "@meshsdk/core";
import { formatTime, formatTxHash } from "../../lib/utils";
import { fetchAdaPrice } from "../../lib/api";
import { DeployButton } from "../../components/buttons/DeployButton";
import { QueryButton } from "../../components/buttons/QueryButton";
import { mConStr0, stringToHex } from "@meshsdk/common";
import { States } from "../../lib/oracle-states";

const blockchainProvider = new BlockfrostProvider(process.env.NEXT_PUBLIC_BLOCKFROST as string);

const mesh = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    evaluator: blockchainProvider,
});

export default function Home() {
    const seconds = 60;
    const { wallet } = useWallet();
    const [state, setState] = useState(States.init);
    const [time, setTime] = useState(seconds);
    const [txHash, setTxHash] = useState("");
    const [oracleAddress, setOracleAddress] = useState("");
    const [policyId, setPolicyId] = useState("");
    const [oracleScript, setOracleScript] = useState({ code: "", version: "" });
    var { connected } = useWallet();

    useEffect(() => {
        let timerId: NodeJS.Timeout;
        if (state === States.deployed && time > 0) {
            timerId = setInterval(() => {
                setTime(prevTime => prevTime - 1);
            }, 1000);
        }

        return () => {
            clearInterval(timerId);
        }
    }, [state, time]);

    useEffect(() => {
        if (time === 0) {
            updateOracle();
        }
    }, [time]);

    const updateOracle = async () => {
        setState(States.updating);
        const address = (await wallet.getUsedAddresses())[0];
        const asset = policyId + stringToHex("OracleNFT");
        const utxos = await blockchainProvider.fetchAddressUTxOs(oracleAddress, asset);
        const oracleUtxo = utxos[0];
        const ownerUtxo = (await blockchainProvider.fetchAddressUTxOs(address))[0];
        const adaPrice = await fetchAdaPrice();
        const datum = adaPrice.toString();

        mesh
            .spendingPlutusScriptV2()
            .txIn(
                oracleUtxo.input.txHash,
                oracleUtxo.input.outputIndex,
                oracleUtxo.output.amount,
                address
            )
            .txInRedeemerValue(mConStr0([]))
            .txInInlineDatumPresent()
            .txInScript(oracleScript.code)
            .txIn(
                ownerUtxo.input.txHash,
                ownerUtxo.input.outputIndex,
                ownerUtxo.output.amount,
                address
            )
            .txInCollateral(
                ownerUtxo.input.txHash,
                ownerUtxo.input.outputIndex,
                [{ unit: "lovelace", quantity: "5000000" }],
                address
            )
            .requiredSignerHash(resolvePaymentKeyHash(address))
            .txOut(oracleAddress, oracleUtxo.output.amount)
            .txOutInlineDatumValue(stringToHex(datum))
            .changeAddress(address)
            .completeSync();

        const signedTx = await wallet.signTx(mesh.txHex, true);
        const newTxHash = await wallet.submitTx(signedTx);
        mesh.reset();
        console.log(newTxHash);
        if (newTxHash) {
            setState(States.updatingConfirming);
            blockchainProvider.onTxConfirmed(
                newTxHash,
                async () => {
                    setState(States.deployed);
                    setTime(seconds);
                    setTxHash(newTxHash);
                },
                100
            );
        }
    }

    return (
        <div className="container">
            <Head>
                <title>ADA's Oracle on cardano</title>
                <meta name="description" content="ADA's Oracle dApp powered my Mesh" />
                <link
                    rel="icon"
                    href="https://meshjs.dev/favicon/favicon-32x32.png"
                />
                <link
                    href="https://meshjs.dev/css/template.css"
                    rel="stylesheet"
                    key="mesh-demo"
                />
            </Head>

            <main className="main">
                <h1 style={{ margin: '0', lineHeight: '1.15', fontSize: '4rem', fontWeight: 200 }}>
                    <a style={{ color: 'orange', textDecoration: 'none' }}>ADA's Oracle</a>
                </h1>

                <div className="demo">
                    <CardanoWallet />
                </div>
                {connected && (
                    <>
                        {(state == States.deployed) && (
                            <>Oracle deployed successfully.</>
                        )}
                        {(state == States.deployConfirming || state == States.updatingConfirming) && (
                            <>Awaiting transaction confirm...</>
                        )}
                    </>
                )}
                <div className="grid">
                    {(state == States.init || state == States.deploying || state == States.deployConfirming) && (
                        <a className="card">
                            <h2>Deploy Oracle</h2>
                            <p>
                                Deploy Oracle and update it automatically:<br />
                                {<DeployButton setState={setState} state={state} setOracleAddress={setOracleAddress} setPolicyId={setPolicyId} setOracleScript={setOracleScript} setTxHash={setTxHash} />}
                            </p>
                        </a>
                    )}

                    {(state == States.deployed || state == States.updatingConfirming || state == States.updating) && (
                        <a className="card">
                            <h2>Oracle deployed data</h2>
                            <p>
                                Tx Hash:<br />{formatTxHash(txHash)}<br />
                                Next update: {formatTime(time)}<br />
                                {<QueryButton state={state} oracleAddress={oracleAddress} policyId={policyId} />}
                            </p>
                        </a>
                    )}
                </div>
            </main>
        </div>
    );
}