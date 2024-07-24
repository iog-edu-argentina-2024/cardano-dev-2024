import { MaestroProvider, UTxO } from "@meshsdk/core";
import type { NextApiRequest, NextApiResponse } from "next";

type Request = {
  scriptAddr: string;
  datumHash: string;
};

const provider: MaestroProvider = new MaestroProvider({
  network: 'Preprod',
  apiKey: process.env.MAESTRO_API_KEY || '',
  turboSubmit: false
});


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UTxO | { error: string }>,
) {
  const { scriptAddr, datumHash }: Request = req.body;
  if (scriptAddr && datumHash) {
    // Obtener todos los utxos del script
    const utxos = await provider.fetchAddressUTxOs(scriptAddr);
    console.log("utxos: ", utxos);
    // Filtrar los utxos que contienen nuestros datos
    const nuestroUTxO: UTxO = utxos.find(utxo => utxo.output.dataHash == datumHash);
    if (nuestroUTxO) {
      res.status(200).json(nuestroUTxO);
    } else
      res.status(400).json({ error: "Pedido valido, pero no encontre el utxo con el hash de datum especificado." });
  } else {
    res.status(400).send({ error: "Pedido invalido." });
  }
}
