export function serializeData(value) {
  return JSON.parse(
    JSON.stringify(value, (_, current) => {
      if (typeof current === "bigint") {
        return current.toString();
      }

      if (
        current &&
        typeof current === "object" &&
        "toNumber" in current &&
        typeof current.toNumber === "function"
      ) {
        return current.toNumber();
      }

      return current;
    }),
  );
}
