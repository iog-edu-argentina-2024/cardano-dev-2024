import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx } from "@/utilities/utilities";
import {
    PaymentKeyHash,
    SpendingValidator,
    UTxO,
    getAddressDetails,
} from "lucid-cardano";
import { applyParamsToScript, Data, Constr } from "lucid-cardano";
import { useContext, useEffect, useState } from "react";

const OracleRedeemer = Data.Enum([
    Data.Literal("Update"),
    Data.Literal("Delete"),
]);
type OracleRedeemer = Data.Static<typeof OracleRedeemer>;

export default function Oracle() {
    const { appState, setAppState } = useContext(AppStateContext);
    const {
        lucid,
        wAddr,
        nftPolicyIdHex,
        nftTokenNameHex,
        nftAssetClassHex,
        oracleWithNftUTxO,
        oracleScript,
        oracleAddress,
    } = appState;
    const [rate, setRate] = useState(100n);
    const [count, setCount] = useState(0);

    useEffect(() => {
        getOracleNftUtxO();
        setTimeout(() => setCount(count + 1), 5e3);
    }, [count]);

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////// HELPER FUNCTIONS ///////////////////////////////////////////

    const getOracleNftUtxO = async () => {
        if (lucid && wAddr && oracleAddress) {
            const oracUtxO = await lucid.utxosAt(oracleAddress).catch((err) => {
                console.log("Can't find Oracle UtxO");
            });
            if (!oracUtxO) return;
            const oracWithNftUTxO = oracUtxO.find((utxo: UTxO) => {
                return Object.keys(utxo.assets).some((key) => {
                    return key == nftAssetClassHex;
                });
            });
            if (
                oracWithNftUTxO == undefined ||
                oracWithNftUTxO == oracleWithNftUTxO
            )
                return;
            setAppState({
                ...appState,
                oracleWithNftUTxO: oracWithNftUTxO,
            });
        }
    };

    const parseRate = (r: string) => {
        const rate = BigInt(Number(r));
        if (Number.isNaN(rate)) return;
        setRate(rate);
    };

    const getFinalScript = async (
        pkh: PaymentKeyHash
    ): Promise<SpendingValidator | undefined> => {
        console.log("Deploying Oracle with Rate and AssetClass: ", {
            rate,
            nftPolicyIdHex,
            nftTokenNameHex,
        });
        if (!lucid || !nftPolicyIdHex || !nftTokenNameHex) return;
        const o_nft = new Constr(0, [nftPolicyIdHex, nftTokenNameHex])
        const parameters =
            new Constr(0, [o_nft, pkh]);
        const oracleScript: SpendingValidator = {
            type: "PlutusV2",
            script: applyParamsToScript(
                "59047b0100003232323232323222322323232253330093232533300b3005300c37540022646464a66601c6012601e6ea80284c8c94ccc040c02cc044dd500089919299980918061998009bab300930143754601260286ea8008dd71803180a1baa3006301437540226eb8c024c050dd51803180a1baa0111325333013300d30143754002264646464a666034603a0042a66602e602266600c6eacc038c064dd50009bae300b30193754601660326ea8058dd71807180c9baa300b3019375402c264a66603001620022940c8c94ccc064c0500045280a99980c9809800899299980d180a980d9baa0011324a26eb4c07cc070dd50008b19991119299980e980b980f1baa001132533302100114c0103d87a8000130103302230230014bd7019198008008029129998110008a5eb804c8c94ccc084c06cc088dd5000899802002001099812981318119baa001330040040023253330213370e900218111baa00113253330223371e6e50dd98008038980a19813000a5eb80530103d87a80003026302337540022980103d87a8000300c30223754604a004604a0022002646600200200644a6660420022980103d87a8000132323253330213371e00c6eb8c08800c4c04ccc0940052f5c026600a00a0046044004604a00460460026603a00697ae03756603c603e603e603e603e603e603e603e603e603e603e60366ea8c034c06cdd50089bae301e301b3754004264944dd6980f180d9baa00230193754002600660326ea80045858c06c004c8cc004004dd61801180c1baa300a3018375401c44a666034002297ae013232533301932533301a3014301b3754002266e3c01cdd7180f980e1baa00114a0601a60366ea8c034c06cdd500109980e80119802002000899802002000980f001180e0009180d180d980d8009bae3018301537540022c600c60286ea8c018c050dd51804980a1baa00216222325333015300f301637540022900009bad301a3017375400264a66602a601e602c6ea80045300103d87a8000132330010013756603660306ea8008894ccc068004530103d87a80001323232533301a3371e00e6eb8c06c00c4c030cc078dd4000a5eb804cc014014008dd6980d801180f001180e000991980080080211299980c8008a6103d87a8000132323253330193371e00e6eb8c06800c4c02ccc074dd3000a5eb804cc014014008dd5980d001180e801180d800980a98091baa0011632330010013758600860246ea8c010c048dd500411299980a0008a6103d87a80001323253330133375e600e602a6ea80080204c014cc05c0092f5c02660080080026030004602c0026e95200010013322323300100100322533301400114a0264a66602466e3cdd7180b8010020a5113300300300130170013758602460266026602660266026602660266026601e6ea8c004c03cdd50029bae3004300f3754018460240026020601a6ea8004528180098061baa0022300f301000114984d958c94ccc020c00c00454ccc02cc028dd50020a4c2c2a66601060040022a66601660146ea80105261616300837540066e1d2002370e90001bad0015734aae7555cf2ab9f5740ae855d101",
                [parameters],
            ),
        };
        return oracleScript;
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// DEPLOY ORACLE ///////////////////////////////////////////

    const deployOracle = async () => {
        if (!lucid || !wAddr) {
            alert("Please connect account and mint NFT!");
            return;
        }
        const pkh: string =
            getAddressDetails(wAddr).paymentCredential?.hash || "";
        const oracle = await getFinalScript(pkh);
        if (!oracle || !nftAssetClassHex) {
            alert("Please mint NFT first!");
            return;
        }
        const oracleAddress = lucid!.utils.validatorToAddress(oracle);
        console.log("final oracle script: ", oracle);
        console.log("final oracle address: ", oracleAddress);
        setAppState({
            ...appState,
            oracleScript: oracle,
            oracleAddress: oracleAddress,
        });

        const tx = await lucid!
            .newTx()
            .payToContract(
                oracleAddress,
                { inline: Data.to(rate, Data.Integer()) },
                { [nftAssetClassHex]: 1n }
            )
            .addSignerKey(pkh)
            .complete();
        await signAndSubmitTx(tx);
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// UPDATE ORACLE ///////////////////////////////////////////

    const updateOracle = async () => {
        if (
            wAddr &&
            lucid &&
            nftAssetClassHex &&
            oracleScript &&
            oracleWithNftUTxO &&
            oracleAddress
        ) {
            const pkh: string =
                getAddressDetails(wAddr).paymentCredential?.hash || "";

            const tx = await lucid!
                .newTx()
                .collectFrom(
                    [oracleWithNftUTxO], // UTXO to spend
                    Data.to<OracleRedeemer>("Update", OracleRedeemer) // Redeemer
                )
                .payToContract(
                    oracleAddress,
                    { inline: Data.to(rate, Data.Integer()) },
                    { [nftAssetClassHex]: 1n }
                )
                .attachSpendingValidator(oracleScript)
                .addSignerKey(pkh)
                .complete();

            await signAndSubmitTx(tx);
        } else {
            alert("Please, deploy the oracle before updating it!");
        }
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// DELETE ORACLE ///////////////////////////////////////////

    const deleteOracle = async () => {
        if (
            wAddr &&
            lucid &&
            nftAssetClassHex &&
            oracleScript &&
            oracleWithNftUTxO &&
            oracleAddress
        ) {
            const pkh: string =
                getAddressDetails(wAddr).paymentCredential?.hash || "";

            const tx = await lucid!
                .newTx()
                .collectFrom(
                    [oracleWithNftUTxO], // UTXO to spend
                    Data.to<OracleRedeemer>("Delete", OracleRedeemer) // Redeemer
                )
                .payToAddress(wAddr, { [nftAssetClassHex]: 1n })
                .attachSpendingValidator(oracleScript)
                .addSignerKey(pkh)
                .complete();

            await signAndSubmitTx(tx);
        } else {
            alert(
                "You have to deploy the oracle before being able to delete it!"
            );
        }
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// UI /////////////////////////////////////////////////

    return (
        <div className="w-full">
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Current price of ADA (in USD cents):</p>
                <input
                    type="number"
                    value={Number(rate)}
                    onChange={(e) => parseRate(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="w-full flex flex-row gap-4">
                <button
                    onClick={deployOracle}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !nftAssetClassHex ||
                        rate === 0n ||
                        !!oracleWithNftUTxO
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Deploy Oracle
                </button>
                <button
                    onClick={updateOracle}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !nftAssetClassHex ||
                        rate === 0n ||
                        !oracleWithNftUTxO
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Update Oracle
                </button>
                <button
                    onClick={deleteOracle}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !nftAssetClassHex ||
                        rate === 0n ||
                        !oracleWithNftUTxO
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold bg-red-400 active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Delete Oracle
                </button>
            </div>
        </div>
    );
}
