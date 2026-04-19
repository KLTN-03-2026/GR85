import { PayOS } from "@payos/node";
import { env } from "./env.js";

const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = env;

export const payos = new PayOS({
  clientId: PAYOS_CLIENT_ID,
  apiKey: PAYOS_API_KEY,
  checksumKey: PAYOS_CHECKSUM_KEY,
});
