# Third-party code and format references

- Three.js 0.187.0, MIT: https://github.com/mrdoob/three.js . Browser runtime and OrbitControls are vendored under `vendor/three`; the license is included there.
- scdbpf by memo33, MIT: https://github.com/memo33/scdbpf . Its DBPF, QFS, FSH and S3D implementations were consulted and adapted for these JavaScript readers. The copyright and license are included in `research/scdbpf-LICENSE.txt`.
- SC4Parser by Matthew Carney, MIT: https://github.com/Killeroo/SC4Parser . Terrain layout was checked against its TerrainMapSubfile implementation. Its notice is included in `research/SC4Parser-LICENSE.txt`.
- sc4 by Sebastiaan Marynissen, MIT: https://github.com/sebamarynissen/sc4 . Current terrain row ordering, saved building, SGProp, network and lot texture layouts were checked and adapted from this implementation. It corrects an older building-field ordering documented elsewhere. Its license is included in `research/sc4-js-LICENSE.txt`.
- innoextract by Daniel Scharrer: https://constexpr.org/innoextract/ . Used as an external extraction tool, not included in this repository.

SimCity 4 and its original content belong to their respective owners. At the user's request, browser asset packs from their supplied game copy are included under `assets/`. These original assets retain their existing ownership and are not licensed under this project's MIT code license. The executable and installer are not included. This is an independent reconstruction project.
