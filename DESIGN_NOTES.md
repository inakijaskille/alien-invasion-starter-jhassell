## Materials

Use realistic desert stone materials:

Main colors:

```
0xd8c7a3
0xc8aa7d
0xb88c5a
0xe2cfac
```

Material settings:

```
roughness: 0.92
metalness: 0.03
```

Add:

- Slight surface color variation
- Darker crevices
- Sun-faded tops
- Sand accumulation near bottoms

Optional:

- Procedural triplanar noise
- Light weathering texture
- Soft dirt overlay

## Scale & World Integration

The obstacles must feel enormous compared to the player.

The player should feel tiny flying through them.

Examples:

- Arches towering above dunes
- Huge columns visible from far away
- Giant ruins fading into fog

The obstacles should naturally emerge from the dunes as if buried over centuries.

Blend obstacle bases into terrain:

- Partially sink bases into dunes
- Add sand buildup around structures
- Avoid floating geometry

## Placement System

Distribute obstacles naturally throughout the desert.

Rules:

- No obstacles directly at spawn
- First 200 units should remain safe
- Obstacles spaced every 250–600 units
- Alternate between open and dense sections
- Always leave at least one clear path

Create cinematic navigation:

- Large fly-through arches
- Narrow ruin corridors
- Open dune expanses
- Monumental gate entrances

The world should feel authored, not random.

## Collision System

Use invisible collision hitboxes separate from visual meshes.

For archways:

- Left column collider
- Right column collider
- Top beam collider
- NO collider in center opening

Collision should trigger:

```
triggerCrash("hit obstacle");
```

Do NOT use one giant collider around entire structures.

## Atmosphere Integration

The obstacles should work with:

- Warm desert fog
- Golden sunset lighting
- Long shadows
- Dust haze
- Infinite dunes

Distant ruins should fade naturally into atmospheric fog.

## Optimization

The obstacles must remain performant.

Use:

- Reused geometry
- Instancing where possible
- Shared materials
- Frustum culling
- Chunk-based spawning

Avoid:

- Excessively detailed meshes
- Thousands of unique materials
- Unnecessary physics

## Final Visual Goal

The player should feel like they are flying a cinematic hovercraft through:

- Endless dunes
- Ancient Greek-inspired ruins
- Massive buried temples
- Monumental arches
- Desert civilization remains

The world should feel:

- Atmospheric
- Cinematic
- Ancient
- Mysterious
- Massive
- Beautiful
- Designed for traversal
