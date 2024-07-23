import { Inter } from "next/font/google";
import Head from "next/head";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { BlockfrostProvider, PlutusScript, resolveDataHash, resolvePaymentKeyHash, resolvePlutusScriptAddress, Transaction, UTxO } from "@meshsdk/core";
import { applyCborEncoding } from "@meshsdk/core-csl";
import { useState } from "react";

const provider = new BlockfrostProvider("preprodTs9TeCpur1MF6NlYABy4B592ds93fG18")

const codigoScript = "5882010000323232323232232225333005323253330073370e900118041baa300b300c0021323300100100222533300c00114a0264a66601466e3cdd718070010040a51133003003001300e00114a06eb0c028c02cc02cc02cc02cc02cc02cc02cc02cc020dd5180500098039baa00114984d958dd7000ab9a5573aaae7955cfaba15745"

const script_if_signed: PlutusScript = {
  version: "V2",
  code: applyCborEncoding(codigoScript)
}

const sAddr = resolvePlutusScriptAddress(script_if_signed, 0)

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [cantidad, setCantidad] = useState<number>(0)
  const { connected, wallet } = useWallet()

  async function encerrarAdaEnScript() {
    if (!wallet) return
    const wAddr = await wallet.getChangeAddress()
    const pkh = resolvePaymentKeyHash(wAddr)
    const tx = new Transaction({ initiator: wallet })
      .sendLovelace({
        address: sAddr,
        datum: { value: pkh, inline: true }
      },
        (cantidad * 1000000).toString()
      )
      .setChangeAddress(wAddr)

    const txBalanceada = await tx.build()
    const txFirmada = await wallet.signTx(txBalanceada)
    const txHash = await wallet.submitTx(txFirmada)
    console.log("txHash de encerrarAdaEnScript: ", txHash)
  }

  async function liberarAdaDeScript() {
    if (!wallet) return
    const wAddr = await wallet.getChangeAddress()
    const pkh = resolvePaymentKeyHash(wAddr)

    const sUtxos: UTxO[] = await provider.fetchAddressUTxOs(sAddr)
    //console.log("sUtxos: ", sUtxos)
    const miUtxo: UTxO | undefined = sUtxos.find(
      utxo => utxo.output.dataHash == resolveDataHash(pkh))
    console.log("miUtxo: ", miUtxo)

    const tx = new Transaction({ initiator: wallet })
      .redeemValue({ script: script_if_signed, value: miUtxo })
      .setRequiredSigners([wAddr])
      .setChangeAddress(wAddr)

    const txBalanceada = await tx.build()
    const txFirmada = await wallet.signTx(txBalanceada, true)
    const txHash = await wallet.submitTx(txFirmada)
    console.log("txHash de liberarAdaDeScript: ", txHash)
  }

  return (
    <div className="bg-gray-900 w-full text-white text-center">
      <Head>
        <title>Mesh App on Cardano</title>
        <meta name="description" content="A Cardano dApp powered my Mesh" />
      </Head>
      <main
        className={`flex min-h-screen flex-col items-center justify-center p-24 ${inter.className} `}
      >
        <div className="mb-6">
          <CardanoWallet />
        </div>
        <label>
          <input
            type="number"
            className="text-black m-2"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))}
          />
        </label>
        <button
          disabled={!connected}
          className="my-6 disabled:bg-gray-700"
          onClick={encerrarAdaEnScript}
        >Encerrar en script</button>
        <button
          disabled={!connected}
          className="my-6 disabled:bg-gray-700"
          onClick={liberarAdaDeScript}
        >Liberar en script</button>
      </main>
    </div>
  );
}
