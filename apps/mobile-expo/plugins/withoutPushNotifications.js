const { withEntitlementsPlist } = require("expo/config-plugins");

function withoutPushNotifications(config) {
  return withEntitlementsPlist(config, (configWithEntitlements) => {
    // BabyFlow schedules local reminders only; this push entitlement prevents free Personal Team signing.
    delete configWithEntitlements.modResults["aps-environment"];
    return configWithEntitlements;
  });
}

module.exports = withoutPushNotifications;
