/**
 * Core regression tests.
 */

function testCoreValidator() {
  const result = Validator.validate(PRODUCT_SCHEMA, {
    Nama: "",
    Kategori: "Coffee",
    Satuan: "Cup",
    Harga: "abc",
  });

  if (result.valid || !Array.isArray(result.errors) || result.errors.length === 0) {
    throw new Error("Validator must reject invalid Product data.");
  }
}

function testCoreResponse() {
  const success = Response.success({ id: "PR001" }, "Saved.");
  const error = Response.error("Not found.");

  if (
    !success.success ||
    success.data.id !== "PR001" ||
    error.success ||
    error.data !== null
  ) {
    throw new Error("Response helpers returned an invalid shape.");
  }
}

