import { PolicyId, UTxO, Unit, Constr } from "lucid-cardano";
import React, { useContext } from "react";
import {
    applyParamsToScript,
    Data,
    MintingPolicy,
    fromText,
} from "lucid-cardano";
import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx } from "@/utilities/utilities";

export default function MintNFT() {
    const { appState, setAppState } = useContext(AppStateContext);
    const { lucid, wAddr, nftPolicyIdHex } = appState;

    const getUtxo = async (address: string): Promise<UTxO> => {
        const utxos = await lucid!.utxosAt(address);
        const utxo = utxos[0];
        return utxo;
    };

    type GetFinalPolicy = {
        nftPolicy: MintingPolicy;
        unit: Unit;
    };

    const getFinalPolicy = async (utxo: UTxO): Promise<GetFinalPolicy> => {
        const tn = fromText("Oracle's NFT");
        const outRef = new Constr(0, [
            new Constr(0, [utxo.txHash]),
            BigInt(utxo.outputIndex),
        ]);
        // const Params = Data.Tuple([Data.Bytes(), Data.Integer(), Data.Bytes()]);
        //type Params = Data.Static<typeof Params>;
        const nftPolicy: MintingPolicy = {
            type: "PlutusV2",
            script: applyParamsToScript(
                "5901700100003232323232323222322253330063253330073370e900018041baa001132323232533300e301100213232533300d323300100100622533301200114a0264a66602066ebcc054c048dd5180a8010078a5113300300300130150011533300d3370e9001000899b8f00200a14a02940dd698070011bae300c00116300f001332232533300c3370e900118069baa00114bd6f7b63009bab3011300e3754002646600200200644a666020002298103d87a8000132323253330103371e00c6eb8c04400c4cdd2a4000660286e980052f5c026600a00a0046eacc044008c050008c048004c8cc004004dd5980798081808180818080019129998070008a5eb7bdb1804c8c8c8c94ccc03ccdc7a45000021003133013337606ea4008dd3000998030030019bab3010003375c601c004602400460200026eb8c038c02cdd50019bac300d00130093754601860126ea800858c02cc030c020dd50008a4c26cac6eb80055cd2ab9d5573caae7d5d02ba157441",
                [outRef, tn],
                // Params
            ),
        };
        const policyId: PolicyId = lucid!.utils.mintingPolicyToId(nftPolicy);
        const unit: Unit = policyId + tn;
        setAppState({
            ...appState,
            nftPolicyIdHex: policyId,
            nftTokenNameHex: tn,
            nftAssetClassHex: unit,
            nftPolicy: nftPolicy,
        });

        return { nftPolicy, unit };
    };

    const mintNFT = async () => {
        console.log("minting NFT for " + wAddr);
        if (wAddr) {
            const utxo = await getUtxo(wAddr);
            const { nftPolicy, unit } = await getFinalPolicy(utxo);

            const tx = await lucid!
                .newTx()
                .mintAssets({ [unit]: 1n }, Data.void())
                .attachMintingPolicy(nftPolicy)
                .collectFrom([utxo])
                .complete();

            await signAndSubmitTx(tx);
        }
    };

    return (
        <button
            onClick={mintNFT}
            disabled={!wAddr || !!nftPolicyIdHex}
            className=" bg-zinc-800 text-white font-quicksand text-lg font-bold py-3 px-8 rounded-lg shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200 disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600"
        >
            {" "}
            Mint Oracle&apos;s NFT
        </button>
    );
}
