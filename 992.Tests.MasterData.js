/**
 * Master-data regression tests.
 */

function testProductService() {
  const response = ProductService().findAll();

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("ProductService.findAll() response is invalid.");
  }
}

function testPartnerService() {
  const response = PartnerService().findAll();

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("PartnerService.findAll() response is invalid.");
  }
}

