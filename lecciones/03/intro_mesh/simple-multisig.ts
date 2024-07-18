import { BlockfrostProvider, MeshTxBuilder, MeshWallet, NativeScript, resolveNativeScriptAddress, resolveNativeScriptHex, resolvePaymentKeyHash, Transaction, UTxO } from "@meshsdk/core";

const proveedor = new BlockfrostProvider("preprodTs9TeCpur1MF6NlYABy4B592ds93fG18")

const wallet1 = new MeshWallet({
  networkId: 0,
  fetcher: proveedor,
  submitter: proveedor,
  key: {
    type: "root",
    bech32: "xprv1zp69n5rxhe5hutewaxarslvte4e0nxfum7ltq3t6ww0vqq3ggfq5j9rhhkgkl0prgasdh6myhpy5weul9gl5ta4fd7tmgtxssp5rjemwvdh07gmp5rh2kujuvt8wls5wmesg8da5mu6dukll8arlmdezku64593z"
  }
})

const wAddr1 = "addr_test1qq38z600zgveyuapyuykjpuk9tyj8jnkd4g2tn3yg5e0sge5vrdege70406mhzxrrf3hhe2ar92k5lzk76zduh4f850sc25r3e"

const wallet2 = new MeshWallet({
  networkId: 0,
  fetcher: proveedor,
  submitter: proveedor,
  key: {
    type: "root",
    bech32: "xprv10p3dxhczurg85csxh33r5tvg6l7d4epdmsms5s3rqkwrmxy6eev2x6dypxvdju6vr9mejmedvn28j3llj6lsmrtgvd2pjmj03hepc3rhgvkrgrasl9wat7v6cx9y44x6vvx0dzqg4hseelay9t5cfn9zfsqkdz9n"
  }
})

const wAddr2 = "addr_test1qrnyus9g7vwda4u27ce0ngtwtckrka6g6g2lfjjdthwcgpjlfzye6x4vqugpvg3ef7m2mx03z6888867trqektaj62esfm3e39"


const multisigScript: NativeScript = {
  type: "all",
  scripts: [
    {
      type: "sig",
      keyHash: resolvePaymentKeyHash(wAddr1)
    }, {
      type: "sig",
      keyHash: resolvePaymentKeyHash(wAddr2)
    }
  ]
}

const scriptAddr = resolveNativeScriptAddress(multisigScript, 0)

async function encerrarEnScript(valor: string) {
  const tx = new Transaction({ initiator: wallet1 })
    .sendLovelace(
      {
        address: scriptAddr,
        datum: {
          value: "curso-cardano-arg",
          inline: true
        }
      },
      valor
    )
    .setChangeAddress(wAddr1)

  const txCruda = await tx.build()
  const txFirmada = await wallet1.signTx(txCruda)
  const txHash = await wallet1.submitTx(txFirmada)
  console.log("hash de Tx: ", txHash)

}

async function liberarDeScript() {
  const wUtxos: UTxO = (await wallet1.getUtxos())[0];
  console.log("wUtxos", wUtxos)
  const sUtxos = (await proveedor.fetchAddressUTxOs(scriptAddr))[0];
  console.log("sUtxos", sUtxos)

  const tx = new MeshTxBuilder({})
    .txIn(
      wUtxos.input.txHash,
      wUtxos.input.outputIndex,
      wUtxos.output.amount,
      wAddr1
    )
    .txIn(
      sUtxos.input.txHash,
      sUtxos.input.outputIndex,
      sUtxos.output.amount,
      scriptAddr
    )
    .requiredSignerHash(resolvePaymentKeyHash(wAddr1))
    .requiredSignerHash(resolvePaymentKeyHash(wAddr2))
    .txInScript(resolveNativeScriptHex(multisigScript))
    .changeAddress(wAddr1)
    .completeSync()


  const txFirmadaPor1 = await wallet1.signTx(tx.txHex, true)
  const txFirmadaPor2 = await wallet2.signTx(txFirmadaPor1, true)
  const txHash = await wallet1.submitTx(txFirmadaPor2)
  console.log("hash de Tx: ", txHash)
}

await liberarDeScript()

