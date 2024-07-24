import { useWallet } from "@meshsdk/react";
import {
  resolvePlutusScriptAddress,
  Transaction,
  resolvePaymentKeyHash,
  BlockfrostProvider,
  UTxO,
} from "@meshsdk/core";
import { applyParamsToScript, getV2ScriptHash } from '@meshsdk/core-csl';
import { stringToHex } from "@meshsdk/common";
import { fetchAdaPrice } from "../../lib/api";
import { States } from "../../lib/oracle-states";
import { SetState } from "../../lib/types";

const scriptNft = "5901cf01000032323232323232223223232322533300932533300a3005300b3754002264646464a66602260280042646464a666022601860246ea803454ccc04400454ccc044c02c0084cdc78018070a5014a02a66602266e1d200100213371e00601c2940c8cc004004018894ccc054004528099299980999baf301830153754603000402429444cc00c00c004c060004dd6980a180a8011bae30130011637586024002664464a66601e601260206ea800452f5c026eb0c050c044dd500099198008008019129998098008a6103d87a8000132323253330133371e00c6eb8c06000c4cdd2a40006602e6e9c0052f5c026600a00a0046eb0c05cc060008c05c008dd6180a80099198008009bac3012301330133013301300322533301100114bd70099191919299980919b8f4881000021003133016374e6602c6ea4008cc058dd3800a5eb80cc01801800cdd6180b180b8019bae30150023015002375860260026eb8c044c038dd50019bac3010001300c3754601e60186ea800858c038c03cc02cdd50008a4c26cac64a66601060060022a66601660146ea8010526161533300830020011533300b300a37540082930b0b18041baa003370e90011b8748000dd7000ab9a5573aaae7955cfaba05742ae89"
const scriptOracle = "5904860100003232323232323222322323232253330093232533300b3005300c37540022646464a66601c6012601e6ea80284c8c94ccc040c02cc044dd500089919299980918061998009bac300930143754601260286ea8008dd71803180a1baa3006301437540226eb8c024c050dd51803180a1baa0111325333013300d30143754002264646464a666034603a0042a66602e602266600c6eb0c038c064dd50009bae300b30193754601660326ea8058dd71807180c9baa300b3019375402c264a66603001620022940c8c94ccc064c0500045280a99980c9809800899299980d180a980d9baa0011324a26eb8c07cc070dd50008b19991119299980e980b980f1baa001132533302100114c0103d87a8000130103302230230014bd7019198008008029129998110008a5eb804c8c94ccc084c06cc088dd5000899802002001099812981318119baa001330040040023253330213370e900218111baa00113253330223371e6e50dd98008038980a19813000a5eb80530103d87a80003026302337540022980103d87a8000300c30223754604a004604a0022002646600200200644a6660420022980103d87a8000132323253330213371e00c6eb8c09800c4c04ccc0940052f5c026600a00a004604a604c004604a0046eb0c08c004cc07400d2f5c06eb0c078c07cc07cc07cc07cc07cc07cc07cc07cc07cc07cc06cdd51806980d9baa011375c603c60366ea80084c9289bae301e301b375400460326ea8004c00cc064dd50008b0b180d80099198008009bac300230183754601460306ea8038894ccc06800452f5c026464a66603264a666034602860366ea80044cdc78039bae301f301c37540022940c034c06cdd51806980d9baa00213301d00233004004001133004004001301e002301c0012301a301b301b001375c6030602a6ea800458c018c050dd51803180a1baa3009301437540042c44464a66602a601e602c6ea8004520001375a6034602e6ea8004c94ccc054c03cc058dd50008a6103d87a8000132330010013758603660306ea8008894ccc068004530103d87a80001323232533301a3371e00e6eb8c07c00c4c030cc078dd4000a5eb804cc014014008dd6980f180f801180f0011bac301c001323300100100422533301900114c103d87a8000132323253330193371e00e6eb8c07800c4c02ccc074dd3800a5eb804cc014014008dd6180e980f001180e8011bac301b0013015301237540022c64660020026eb0c010c048dd5180218091baa00822533301400114c103d87a80001323253330133375e600e602a6ea80080204c014cc05c0092f5c02660080080026030004602c0026e95200010013322323300100100322533301400114a0264a66602466e3cdd7180b8010020a5113300300300130170013758602460266026602660266026602660266026601e6ea8c004c03cdd50029bae3004300f3754018460240026020601a6ea8004528180098061baa0022300f301000114984d958c94ccc020c00c00454ccc02cc028dd50020a4c2c2a66601060040022a66601660146ea80105261616300837540066e1d2002370e90001bae0015734aae7555cf2ab9f5740ae855d101"

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
    const cborPolicy = applyParamsToScript(scriptNft, [outRef, "OracleNFT"]);
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

    const cborScript = applyParamsToScript(scriptOracle, [parameter]);
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
