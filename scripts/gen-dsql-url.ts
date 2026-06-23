import { DsqlSigner } from "@aws-sdk/dsql-signer";

async function main() {
  const hostname = process.env.DSQL_HOSTNAME;
  const region = process.env.AWS_REGION ?? "us-east-2";

  if (!hostname) {
    console.error("DSQL_HOSTNAME env var is required");
    process.exit(1);
  }

  const signer = new DsqlSigner({ hostname, region });
  const token = await signer.getDbConnectAdminAuthToken();
  const url = `postgresql://admin:${encodeURIComponent(token)}@${hostname}:5432/postgres?sslmode=require`;

  console.log("\nDATABASE_URL=" + url);
  console.log("\n⚠️  This token expires in 15 minutes. Use it quickly for db:push and db:seed.");
}

main().catch((e) => { console.error(e); process.exit(1); });
