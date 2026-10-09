# Changelog

## Unreleased

### Breaking changes

- Retain the four runtime helpers and the authored `Catalog`, `CatalogMessage`
  and serialized `I18nHydration` contracts at the root. Move `I18n`,
  `I18nScopeProps`, `LocaleAttributes`, `LocaleAttributeTarget`, and `TextDirection`
  to private ownership; derive their types from the service and helper methods.
- Hide accidentally published inference types `CatalogKey`, `LocaleOf`,
  `MessageArgs`, `MessageAt`, `SameTuple`, `ValidCatalog`, and `ValidCatalogs`.
  Let `createI18n` infer catalog keys and message argument tuples.

### Fixes

- Require catalog maps and source catalogs to have the documented object shape,
  with corrective errors for malformed runtime input.
- Reject inherited object methods as missing messages; explicitly authored
  prototype-named messages remain valid.
- Require formatted message results to be strings on both scoped and explicit
  locale paths, with the same corrective error.
