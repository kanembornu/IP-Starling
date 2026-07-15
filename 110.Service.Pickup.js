/**
 * =============================================================================
 * FILE        : 110.Service.Pickup.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Pickup Service
 * =============================================================================
 *
 * Business Rule Pickup.
 *
 * =============================================================================
 */

function PickupService() {
  return TransactionService.create({
    headerSchema: PICKUP_HEADER_SCHEMA,

    detailSchema: PICKUP_DETAIL_SCHEMA,

    detailForeignKey: PICKUP_DETAIL_FIELDS.PICKUP_ID,
  });
}
