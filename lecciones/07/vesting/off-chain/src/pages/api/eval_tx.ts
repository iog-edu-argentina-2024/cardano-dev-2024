import { MaestroProvider } from "@meshsdk/core";
import type { NextApiRequest, NextApiResponse } from "next";

type Request = {
  tx: string;
};

const provider: MaestroProvider = new MaestroProvider({
  network: 'Preprod',
  apiKey: process.env.MAESTRO_API_KEY || '',
  turboSubmit: false
});


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { tx }: Request = req.body;
  if (tx) {
    try {
      const resp = await provider.evaluateTx(tx);
      console.log("evaluando Tx - resp: ", resp);
      res.status(200).send(resp);
    } catch (error) {
      console.error("error evaluando Tx: ", error);
      res.status(400).json({ error: error });
    }
  } else
    res.status(400).json({ error: "Pedido valido. Envie una Tx firmada" });
}
