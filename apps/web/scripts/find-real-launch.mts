const query = `
query {
  EVM(dataset: combined, network: rbh) {
    Events(
      limit: {count: 5}
      orderBy: {descending: Block_Time}
      where: {
        Log: {Signature: {Name: {is: "TokenLaunched"}}}
        SmartContract: {Address: {is: "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB"}}
      }
    ) {
      Block { Number Time }
      Transaction { Hash }
      Log { Signature { Name } }
      Arguments { Name Value { ... on EVM_ABI_Address_Value_Arg { address } } }
    }
  }
}`;

const res = await fetch("https://streaming.bitquery.io/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
console.log("status:", res.status);
console.log(await res.text());
