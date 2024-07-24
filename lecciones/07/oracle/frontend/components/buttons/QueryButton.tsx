import React from "react";
import { useWallet } from "@meshsdk/react";
import {
    BlockfrostProvider,
    readPlutusData
} from "@meshsdk/core";
import { stringToHex, hexToString } from "@meshsdk/common";
import { States } from "../../lib/oracle-states";

const blockchainProvider = new BlockfrostProvider(process.env.NEXT_PUBLIC_BLOCKFROST as string);

type QueryParams = {
    state: States,
    oracleAddress: string,
    policyId: string,
}

export function QueryButton({ state, oracleAddress, policyId }: QueryParams) {
    const { connected } = useWallet();

    async function queryOracle() {
        const asset = policyId + stringToHex("OracleNFT");
        const utxo = (await blockchainProvider.fetchAddressUTxOs(oracleAddress, asset))[0];
        let value = hexToString(readPlutusData(utxo.output.plutusData));
        alert("ADA's oracle price: " + value);
    }

    return (
        <button type="button" onClick={() => queryOracle()} className="demo button" disabled={!connected || state !== States.deployed}>
            Query Oracle
        </button>
    );
}
