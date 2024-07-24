import { useWallet } from "@meshsdk/react";
import {
    resolvePlutusScriptAddress,
    Transaction,
    resolvePaymentKeyHash,
    BlockfrostProvider,
    UTxO,
} from "@meshsdk/core";
import { applyParamsToScript, getV2ScriptHash } from '@meshsdk/core-csl';
import plutusScript from "../../../onchain/plutus.json";
import { stringToHex } from "@meshsdk/common";
import { fetchAdaPrice } from "../../lib/api";
import { States } from "../../lib/oracle-states";
import { SetState } from "../../lib/types";

const blockchainProvider = new BlockfrostProvider(process.env.NEXT_PUBLIC_BLOCKFROST as string);

type DeployParams = {
    setState: SetState<States>,
    state: States,
    setOracleAddress: SetState<string>,
    setPolicyId: SetState<string>,
    setOracleScript: SetState<any>,
    setTxHash: SetState<string>
}
export function DeployButton({ setState, state, setOracleAddress, setPolicyId, setOracleScript, setTxHash }: DeployParams) {
    const { wallet, connected } = useWallet();

    async function getPolicy(utxo: UTxO) {
        const outRef = {
            alternative: 0,
            fields: [{
                alternative: 0,
                fields: [utxo.input.txHash]
            }, utxo.input.outputIndex]
        };
        const cborPolicy = applyParamsToScript(plutusScript.validators.filter(val => val.title == "lesson02/nft.nft")[0].compiledCode, [outRef, "OracleNFT"]);
        return {
            code: cborPolicy,
            version: "V2"
        };
    }

    async function getAsset(oracleAddress: string) {
        const adaPrice = await fetchAdaPrice();
        const datum = adaPrice.toString();
        return {
            assetName: "OracleNFT",
            assetQuantity: "1",
            label: "721",
            recipient: {
                address: oracleAddress,
                datum: {
                    value: datum,
                    inline: true
                }
            }
        };
    }

    function getOracleScript(policy: any, address: string) {
        const nftPolicy = getV2ScriptHash(policy.code);
        const pkh = resolvePaymentKeyHash(address);
        const oNft = { alternative: 0, fields: [nftPolicy, stringToHex("OracleNFT")] };

        const parameter = {
            alternative: 0,
            fields: [oNft, pkh]
        };

        const cborScript = applyParamsToScript(plutusScript.validators.filter(val => val.title == "lesson02/oracle.oracle")[0].compiledCode, [parameter]);
        return {
            code: cborScript,
            version: "V2"
        };
    }

    async function deployOracle() {
        setState(States.deploying);
        const utxos = (await wallet.getUtxos());
        const utxo = utxos[0];
        const address = (await wallet.getUsedAddresses())[0];
        const policy = await getPolicy(utxo);
        const redeemer = { data: { alternative: 0, fields: [] }, tag: 'MINT' };
        const oracleAddress = resolvePlutusScriptAddress(getOracleScript(policy, address));
        const mintAsset = await getAsset(oracleAddress);
        const collateral = await wallet.getCollateral();
        setOracleAddress(oracleAddress);
        setPolicyId(getV2ScriptHash(policy.code));
        setOracleScript(getOracleScript(policy, address));

        const tx = new Transaction({ initiator: wallet })
            .mintAsset(policy, mintAsset, redeemer)
            .setTxInputs(utxos)
            .setCollateral(collateral);

        const unsignedTx = await tx.build();
        const signedTx = await wallet.signTx(unsignedTx);
        const txHash = await wallet.submitTx(signedTx);
        console.log(txHash);
        if (txHash) {
            setState(States.deployConfirming);
            blockchainProvider.onTxConfirmed(
                txHash,
                async () => {
                    setState(States.deployed);
                    setTxHash(txHash);
                },
                100
            );
        }
    }

    return (
        <button type="button" onClick={() => deployOracle()} className="demo button" disabled={!connected || state !== States.init}>
            Deploy
        </button>
    );
}