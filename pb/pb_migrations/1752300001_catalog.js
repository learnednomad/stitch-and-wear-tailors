/// <reference path="../pb_data/types.d.ts" />
/**
 * Catalog collections: garment styles (seeded, public read) and fabrics
 * (tailor-owned inventory, browsable by clients).
 */
migrate(
  (app) => {
    const usersId = app.findCollectionByNameOrId("users").id

    const catalogStyles = new Collection({
      type: "base",
      name: "catalog_styles",
      listRule: "",
      viewRule: "",
      // create/update/delete: superuser only (seeded)
      fields: [
        { name: "name", type: "text", required: true, max: 100 },
        {
          name: "category",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "agbada",
            "senator",
            "kaftan",
            "dashiki",
            "buba_sokoto",
            "iro_buba",
            "ankara_gown",
            "suit",
            "shirt",
            "trouser",
            "dress",
            "other",
          ],
        },
        {
          name: "gender",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["male", "female", "unisex"],
        },
        { name: "description", type: "text", max: 1000 },
        { name: "basePrice", type: "number", min: 0 },
        { name: "currency", type: "select", maxSelect: 1, values: ["NGN", "USD", "GBP", "EUR"] },
        {
          name: "images",
          type: "file",
          maxSelect: 5,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        { name: "tags", type: "json", maxSize: 2000 },
        { name: "isActive", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_catalog_styles_category ON catalog_styles (category)",
        "CREATE INDEX idx_catalog_styles_active ON catalog_styles (isActive)",
      ],
    })
    app.save(catalogStyles)

    const fabrics = new Collection({
      type: "base",
      name: "fabrics",
      listRule: "isActive = true || owner = @request.auth.id",
      viewRule: "isActive = true || owner = @request.auth.id",
      createRule: '@request.auth.userType = "tailor" && owner = @request.auth.id',
      updateRule: "owner = @request.auth.id",
      deleteRule: "owner = @request.auth.id",
      fields: [
        { name: "name", type: "text", required: true, max: 100 },
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "ankara",
            "aso_oke",
            "adire",
            "lace",
            "george",
            "senator_material",
            "kente",
            "cotton",
            "silk",
            "wool",
            "linen",
            "polyester",
            "mixed",
            "other",
          ],
        },
        { name: "color", type: "text", required: true, max: 50 },
        { name: "pattern", type: "text", max: 50 },
        { name: "pricePerMeter", type: "number", min: 0 },
        { name: "availableQuantity", type: "number", min: 0 },
        { name: "supplier", type: "text", max: 100 },
        { name: "description", type: "text", max: 500 },
        {
          name: "owner",
          type: "relation",
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: "images",
          type: "file",
          maxSelect: 5,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        { name: "isActive", type: "bool" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE INDEX idx_fabrics_type ON fabrics (type)",
        "CREATE INDEX idx_fabrics_owner ON fabrics (owner)",
        "CREATE INDEX idx_fabrics_active ON fabrics (isActive)",
      ],
    })
    app.save(fabrics)
  },
  (app) => {
    for (const name of ["fabrics", "catalog_styles"]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
