import { BlockfrostProvider, MeshWallet, Transaction } from "@meshsdk/core";

const proveedor = new BlockfrostProvider("preprodTs9TeCpur1MF6NlYABy4B592ds93fG18")

const wallet = new MeshWallet({
  networkId: 0,
  fetcher: proveedor,
  submitter: proveedor,
  key: {
    type: "root",
    bech32: "xprv1zp69n5rxhe5hutewaxarslvte4e0nxfum7ltq3t6ww0vqq3ggfq5j9rhhkgkl0prgasdh6myhpy5weul9gl5ta4fd7tmgtxssp5rjemwvdh07gmp5rh2kujuvt8wls5wmesg8da5mu6dukll8arlmdezku64593z"
  }
})

const wAddr = "addr_test1qq38z600zgveyuapyuykjpuk9tyj8jnkd4g2tn3yg5e0sge5vrdege70406mhzxrrf3hhe2ar92k5lzk76zduh4f850sc25r3e"

const tx = new Transaction({ initiator: wallet })
  .sendLovelace(
    "addr_test1qrcsu0x34ye9dv5rdcnvzs5fyszf09zfkvr75lqwljlkj3r7cm477qh03xkw55pjta25uvumutk48msee9prpythw0sqev8r56",
    "30000000"
  )
  .setChangeAddress(wAddr)

const txCruda = await tx.build()
const txFirmada = await wallet.signTx(txCruda)
const txHash = await wallet.submitTx(txFirmada)
console.log("hash de Tx: ", txHash)






