export const FLYER_DEFS = [
  { id: 'bird', label: 'paper bird', radius: 0.7, weight: 1 },
  {
    id: 'butterfly', label: 'paper butterfly', radius: 0.65, weight: 0.7,
    tex: '/assets/flyer-butterfly.jpg', scale: 1.5,
  },
  {
    id: 'balloon', label: 'runaway balloon', radius: 0.85, weight: 0.55,
    tex: '/assets/flyer-balloon.jpg', scale: 1.6, floaty: true,
  },
  {
    id: 'kite', label: 'loose kite', radius: 0.75, weight: 0.5,
    tex: '/assets/flyer-kite.jpg', scale: 1.55, weave: true,
  },
  {
    id: 'biplane', label: 'toy biplane', radius: 0.9, weight: 0.45,
    tex: '/assets/flyer-biplane.jpg', scale: 1.7, dive: true,
  },
  { id: 'dragonfly', label: 'paper dragonfly', radius: 0.55, weight: 0.5 },
  {
    id: 'swarm', label: 'flock of paper cranes', radius: 0.95, weight: 0.35,
    tex: '/assets/birds.jpg', scale: 1.9,
  },
  { id: 'wasp', label: 'paper wasp', radius: 0.45, weight: 0.4, dive: true, weave: true },
  {
    id: 'hawk', label: 'diving origami hawk', radius: 0.9, weight: 0.3,
    tex: '/assets/obstacles/obstacle-origami-hawk.png', scale: 1.9, alpha: true, dive: true,
  },
  {
    id: 'pinwheel', label: 'spinning paper pinwheel', radius: 0.9, weight: 0.28,
    tex: '/assets/obstacles/obstacle-paper-pinwheel.png', scale: 1.8, alpha: true, spin: true,
  },
  {
    id: 'meteor', label: 'paperclip meteor', radius: 0.85, weight: 0.24,
    tex: '/assets/obstacles/obstacle-paperclip-meteor.png', scale: 1.75, alpha: true, barrel: true,
  },
  {
    id: 'clothespinDragonfly', label: 'snapping clothespin dragonfly', radius: 0.85, weight: 0.3,
    tex: '/assets/obstacles/obstacle-clothespin-dragonfly.png', scale: 1.9, alpha: true, weave: true,
  },
]
