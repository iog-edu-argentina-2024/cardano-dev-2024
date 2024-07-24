import { Inter } from "next/font/google";
import Head from "next/head";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { Data, resolveDataHash, resolvePaymentKeyHash, resolvePlutusScriptAddress, resolveSlotNo, Transaction, UTxO } from '@meshsdk/core';
import { PlutusScript } from '@meshsdk/core';
import { applyCborEncoding, applyParamsToScript } from "@meshsdk/core-csl";
import { useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { wallet } = useWallet();
  const [cantidad, setCantidad] = useState<number>(0);
  const [beneficiario, setBeneficiario] = useState<string>('');
  const [fechaLimite, setFechaLimite] = useState<string>('');
  const [evaluate, setEvaluate] = useState<boolean>(false);

  async function buscarUTxO(scriptAddr: string, datum: any): Promise<UTxO | undefined> {
    try {
      const resp = await fetch('/api/buscar_utxo', {
        method: 'POST',
        body: JSON.stringify({ scriptAddr: scriptAddr, datumHash: resolveDataHash(datum) }),
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await resp.json();
      console.log(json);
      return json as UTxO;
    }
    catch (error) {
      console.error("error buscando UTxO: ", error);
      return undefined;
    }
  }

  // Preparar parámetros y aplicar al script
  function getScript(): Data {
    const dateObject = new Date(fechaLimite);
    const posixTime = dateObject.getTime();
    //const posixTime = dateObject.getTime() - 700000;
    const benefPKH = resolvePaymentKeyHash(beneficiario)
    const params: Data = { alternative: 0, fields: [benefPKH, posixTime] };
    console.log("Parámetros: ", params);
    const script: PlutusScript = {
      version: 'V2',
      code: applyParamsToScript(
        '59013b0100003232323232322232232253330073232323253323300c3001300d37546020602200a26464a66601c64646600200200c44a66602800229404c94ccc048cdc79bae301600200414a2266006006002602c0026eb8c008c040dd500688008a503232325333010300530113754002264a66602264a66602a60280022a666024600e6026002294454ccc048cdc3a4000602600229405858dd5180218099baa300530133754010266e2000c0044cdc48018009bad3014301237540022940c00cc044dd5180198089baa006375a600260206ea80348c048c04c0048c044004dc3a40042940dd6180718078011806800980698069806980698069806980698051baa300c0013009375400229309b2b19299980319b8748000c01c00454ccc024c020004526161637540026e64dd7000ab9a5573aaae7955cfaba157441',
        [params]
      ),
    };
    return script;
  }

  async function evaluateTx(txFirmada: string): Promise<void> {
    await fetch('/api/eval_tx', {
      method: 'POST',
      body: JSON.stringify({ tx: txFirmada }),
      headers: { 'Content-Type': 'application/json' }
    }).then(response => console.log("evalTx: ", response));
  }

  async function encerrarAdaEnScript() {
    if (!wallet) return;
    try {
      const script = getScript();
      const scriptAddr = resolvePlutusScriptAddress(script, 0);
      const tx = new Transaction({ initiator: wallet })
        .sendLovelace({
          address: scriptAddr, datum: { value: "", inline: true }
        }, (cantidad * 1000000).toString()
        )
      const txBalanceada = await tx.build();
      const txFirmada = await wallet.signTx(txBalanceada);
      if (evaluate) {
        await evaluateTx(txFirmada);
      } else {
        const txHash = await wallet.submitTx(txFirmada);
        console.log(`txHash:\n ${txHash}`);
      }
    } catch (error) {
      console.error("Error encerrando ada: ", error);
    }
  }

  async function liberarDeScript() {
    if (!wallet) return;
    try {
      const script = getScript();
      const scriptAddr = resolvePlutusScriptAddress(script, 0);
      const wAddr = await wallet.getChangeAddress();
      console.log(scriptAddr);

      const nuestroUTxO = await buscarUTxO(scriptAddr, "");
      console.log("nuestroUTxO: ", nuestroUTxO);
      if (!nuestroUTxO) {
        console.log("No se encontro el utxo con el datum especificado.");
        return
      };

      const slot = resolveSlotNo('preprod', Date.now() - 15000);

      const tx = new Transaction({ initiator: wallet })
        .redeemValue({ value: nuestroUTxO, script: script })
        .setTimeToStart(slot)
        .setRequiredSigners([wAddr])

      const txBalanceada = await tx.build();
      const txFirmada = await wallet.signTx(txBalanceada, true);
      if (evaluate) {
        await evaluateTx(txFirmada);
      } else {
        const txHash = await wallet.submitTx(txFirmada);
        console.log(`txHash:\n ${txHash}`);
      }
    } catch (error) {
      console.error("Error liberando ada: ", error);
    }
  }



  return (
    <div className="bg-gray-900 w-full text-white text-center">
      <Head>
        <title>Mesh App on Cardano</title>
        <meta name="description" content="A Cardano dApp powered my Mesh" />
      </Head>
      <main
        className={`flex min-h-screen flex-col items-center justify-center p-24 space-y-8 ${inter.className} `}
      >
        <h1 className="text-6xl font-thin mb-20">
          Vesting Dapp
        </h1>
        <CardanoWallet />
        <label>Cuantos ADA quiere encerrar?
          <input
            type="number"
            className="text-black m-2"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))} />
        </label>
        <label>Quien es el beneficiario?
          <input
            type="string"
            className="text-black m-2"
            value={beneficiario}
            onChange={(e) => setBeneficiario(e.target.value)} />
        </label>
        <label>Cuando lo puede liberar?
          <input
            type="datetime-local"
            className="text-black m-2"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)
            } />
        </label>
        <label>Evaluar Tx en lugar de enviarla?
          <input
            type="checkbox"
            className="ml-2 size-4"
            checked={evaluate}
            onChange={(e) => setEvaluate(e.target.checked)} />
        </label>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
          disabled={!wallet || !beneficiario || !fechaLimite}
          onClick={encerrarAdaEnScript}
        >Encerrar ADA</button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
          disabled={!wallet || !beneficiario || !fechaLimite}
          onClick={liberarDeScript}
        >Redimir</button>
      </main >
    </div >
  );
}
