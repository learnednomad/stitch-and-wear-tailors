/// <reference path="../pb_data/types.d.ts" />
/**
 * Extend the built-in users auth collection with Stitch & Wear profile fields.
 * PocketBase natively handles email/password, verification, password reset,
 * OTP/MFA and sessions — the old Appwrite auth collections are not recreated.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")

    users.fields.add(
      new Field({
        name: "firstName",
        type: "text",
        required: true,
        max: 100,
      }),
    )
    users.fields.add(
      new Field({
        name: "lastName",
        type: "text",
        required: true,
        max: 100,
      }),
    )
    users.fields.add(
      new Field({
        name: "userType",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["client", "tailor", "admin"],
      }),
    )
    users.fields.add(
      new Field({
        name: "phone",
        type: "text",
        max: 20,
      }),
    )
    users.fields.add(
      new Field({
        name: "status",
        type: "select",
        maxSelect: 1,
        values: ["pending_verification", "active", "suspended", "pending_tailor_approval"],
      }),
    )
    users.fields.add(
      new Field({
        name: "businessName",
        type: "text",
        max: 150,
      }),
    )
    users.fields.add(
      new Field({
        name: "bio",
        type: "text",
        max: 1000,
      }),
    )
    users.fields.add(
      new Field({
        name: "location",
        type: "text",
        max: 200,
      }),
    )
    users.fields.add(
      new Field({
        name: "lastLoginAt",
        type: "date",
      }),
    )

    // Signup is open; users see themselves; clients can browse tailors.
    users.listRule = 'id = @request.auth.id || userType = "tailor" || @request.auth.userType = "admin"'
    users.viewRule = 'id = @request.auth.id || userType = "tailor" || @request.auth.userType = "admin"'
    users.createRule = ""
    users.updateRule = "id = @request.auth.id"
    users.deleteRule = "id = @request.auth.id"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    for (const name of [
      "firstName",
      "lastName",
      "userType",
      "phone",
      "status",
      "businessName",
      "bio",
      "location",
      "lastLoginAt",
    ]) {
      users.fields.removeByName(name)
    }
    app.save(users)
  },
)
