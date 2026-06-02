// Vietnamese banks. `code` is what we store in users.bank_id; `vietqr` is the
// short code img.vietqr.io expects when generating a dynamic QR.
export type Bank = { code: string; label: string; vietqr: string };

export const BANKS: Bank[] = [
  { code: "vcb", label: "Vietcombank", vietqr: "VCB" },
  { code: "tcb", label: "Techcombank", vietqr: "TCB" },
  { code: "mbbank", label: "MB Bank", vietqr: "MB" },
  { code: "vpb", label: "VPBank", vietqr: "VPB" },
  { code: "bidv", label: "BIDV", vietqr: "BIDV" },
  { code: "vietinbank", label: "VietinBank", vietqr: "ICB" },
  { code: "acb", label: "ACB", vietqr: "ACB" },
  { code: "sacombank", label: "Sacombank", vietqr: "STB" },
  { code: "hdbank", label: "HDBank", vietqr: "HDB" },
  { code: "agribank", label: "Agribank", vietqr: "VBA" },
  { code: "tpbank", label: "TPBank", vietqr: "TPB" },
  { code: "vib", label: "VIB", vietqr: "VIB" },
  { code: "shb", label: "SHB", vietqr: "SHB" },
  { code: "ocb", label: "OCB", vietqr: "OCB" },
];

export const bankByCode = (code: string | null | undefined): Bank | undefined =>
  code ? BANKS.find((b) => b.code === code) : undefined;
