/* ============================================================
   HoovyTube Journal — posts data
   ------------------------------------------------------------
   To publish a new post: copy the template below, fill it in,
   and add it to the HT_POSTS array. Newest date shows first.

   {
     slug:    'url-safe-name',            // becomes /blog/#/url-safe-name
     title:   'Post title',
     dek:     'One-line standfirst shown under the title.',
     date:    '2026-08-17',               // YYYY-MM-DD
     author:  'HoovyTube',
     tags:    ['tag one', 'tag two'],
     cover:   '/assets/blog/covers/name.jpg',  // optional; falls back gracefully
     coverAlt:'Describe the image for screen readers',
     body: [
       'A paragraph.',
       'Another paragraph.',
       { h: 'A subheading' },             // optional section heading
       { quote: 'A pull quote.' },        // optional pull quote
     ],
   }
   ============================================================ */
window.HT_POSTS = [
  {
    slug: 'shoulders-of-giants',
    title: 'Shoulders of Giants and the end of HoovyTools',
    dek: 'HoovyTools ships next weekend. Before it goes, a note on free tools, the chain I came up through, and building the kind of thing the next person can walk away from.',
    date: '2026-08-17',
    author: 'HoovyTube',
    tags: ['manifesto', 'HoovyTools', 'open source'],
    cover: '/assets/blog/covers/shoulders-of-giants.jpg',
    coverAlt: 'SFM to Blender Particles Import — HoovyTools promotional art.',
    body: [
      "HoovyTools ships next weekend, more or less. It moves models, animation, shape keys, cameras, sounds and particles between an old Valve program and Blender, which is a sentence that means everything to about 20,000 people and nothing at all to everybody else. Before it goes out I want to tie off this chapter with the thing I have been chewing on the whole time I was building it.",
      "I am not interested in building a gig out of this, so HoovyTools is free, and anything I put out without a paywall is yours to do whatever You like with. Credit appreciated, never required. There are paid packs too, and none of them are load-bearing for the free tools.",
      "Addons rotate, scenes rotate, people burn out and hand the keys to whoever is still standing, and that is roughly what I intend to do myself. What survives all that churn is the architecture, and architecture is just a set of decisions somebody made on purpose about how much of Your work should belong to them.",
      "The reason I can walk away at all is the shape of the chain I came up through - shoulders of giants, that sort of beat. Crowbar, dmxconvert.exe and VTF Edit gave us Blender Source Tools, which gave us Source IO, which gave us HoovyTools, and every link carries the same license and bundles nothing You have to keep alive by hand. That is what hobbyists do here: small free tools that pull assets out of a game and into the software where You actually work. Nobody gets paid, the things get given away, and it is a good culture. It has fed me for years and I did not build any of the ground it stands on.",
      "Now take those same methods and build something else with them entirely - an asset pack that arrives dressed as a gift and leaves as a landlord. It requires an asset base: a photocopy of half the game You already own, gigabytes of it living on Your drive under Your custodianship, to be kept fresh forever. In the nastier cases You remove the prefabs and shaders go red in a session that had nothing to do with them, or You pull one folder and the node graph unravels through six layers of things You never knowingly installed. The pack does not break when You abandon it. It breaks Your project when You abandon it, and those are two different products of which only one was advertised.",
      "The distinction landed for me through a guy in the Gothic 2 community: the sort who ships unleaveable prefabs, obscures how they were made, laughs at the original community for “using abandonware”, and designs a workflow that quietly requires him to stay in the picture. He is also the sort who puts his own photograph on the promotional material for a prefab library. Not a logo. His actual face, lit and composed with the chin at a flattering angle, radiating quiet authorship beside a folder of rocks and crates. As though the barrels would not load unless he were standing there in the marketing, gesturing warmly at his own contribution to civilization. A human Netflix subscription, cancellable only by starting over from nothing. Nobody builds a chain like that by accident, and You can see it plainest on the day somebody else solves the problem he was sitting on, because that is the day he panics.",
      "To be clear, making prefab packages is great fun. Twenty hours assembling a package for Unreal out of Gothic 2 files - stuff that would be dead weight in an Unreal user's hands otherwise - is real work and deserves to be treated as such. Nobody owes anybody the files they compiled it with. All of it fine, right up until the intentional chain of asset dependencies leads back to a website that needs the traffic. What I am circling is closer to Edison versus everybody who moved to Hollywood to get away from him, which is possibly my superego using a manifesto about a stupid little addon as an escape hatch into real life. Fine. It is my manifesto.",
      "So I built the former thing. It asks for exactly one converter, dmxconvert.exe, which the original developers put inside Your install fifteen years before I turned up with opinions, and which stays where it sits because its license says so. Nothing mirrored, nothing archived, no build step of mine to keep warm. Burn my account and salt the ground, and HoovyTools runs tomorrow exactly as it runs today. Build Your prefab packages with it, by all means.",
      "Because it leans on nothing but what SFM already has, it does not care what You point it at. Every SFM game asset works - TF2, Portal, Half-Life, Left 4 Dead, whatever else You have mounted, whatever You dragged in yourself. Writing a .pcf reader is harder than rebuilding a particle by hand, and it is the better thing to have, because it teaches the next person to work without me and to carry the method somewhere I will never see. When TF2 ships new particles, or Your sessions folder quietly triples in size, You will not need my pre-approval to use any of it.",
      "That is the whole thought, and by next weekend I would like to be free of it. Take the code when it lands and do better things with it. Whether any of this was worth doing gets decided by how easily the next person walks away from it, which is the only test I know of that a builder cannot rig in his own favour.",
      "And go support the other people making these things: Spooky Cat, BedrockSFM, Hypno, Ibra, doormaker, who helped port my particle resizer into SFM, and especially RedEye.",
    ],
  },
];
