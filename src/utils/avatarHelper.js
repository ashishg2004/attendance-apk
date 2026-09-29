export function getWorkerAvatar(name, trade) {
  const tradeLower = (trade || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();

  // 1. Role / Trade Based Avatar Matching
  if (tradeLower.includes('paint')) return '/assets/avatar_painter.png';
  if (tradeLower.includes('chef') || tradeLower.includes('cook')) return '/assets/avatar_chef.png';
  if (tradeLower.includes('manager') || tradeLower.includes('supervis')) return '/assets/avatar_manager.png';
  if (tradeLower.includes('front') || tradeLower.includes('recept')) return '/assets/avatar_manager.png';
  if (tradeLower.includes('electric')) return '/assets/avatar_electrician.png';
  if (tradeLower.includes('plumb')) return '/assets/avatar_plumber.png';
  if (tradeLower.includes('housekeep') || tradeLower.includes('room service')) return '/assets/avatar_housekeeping.png';
  if (tradeLower.includes('waiter')) return '/assets/avatar_waiter.png';
  if (tradeLower.includes('secur') || tradeLower.includes('guard')) return '/assets/avatar_security.png';
  if (tradeLower.includes('carpent')) return '/assets/avatar_rajesh.png';
  if (tradeLower.includes('mason')) return '/assets/avatar_sunil.png';
  if (tradeLower.includes('help')) return '/assets/avatar_rajesh.png';

  // 2. Name Based Fallback Matching
  if (nameLower.includes('rajesh')) return '/assets/avatar_rajesh.png';
  if (nameLower.includes('sunil')) return '/assets/avatar_sunil.png';
  if (nameLower.includes('amit')) return '/assets/avatar_painter.png';
  if (nameLower.includes('deepak')) return '/assets/avatar_electrician.png';
  if (nameLower.includes('dharmendra')) return '/assets/avatar_chef.png';
  if (nameLower.includes('pankaj')) return '/assets/avatar_security.png';
  if (nameLower.includes('rakesh')) return '/assets/avatar_manager.png';
  if (nameLower.includes('suresh')) return '/assets/avatar_plumber.png';

  // 3. Fallback based on trade string hashing if available
  if (tradeLower) {
    const avatars = [
      '/assets/avatar_chef.png',
      '/assets/avatar_painter.png',
      '/assets/avatar_manager.png',
      '/assets/avatar_electrician.png',
      '/assets/avatar_plumber.png',
      '/assets/avatar_housekeeping.png',
      '/assets/avatar_waiter.png',
      '/assets/avatar_security.png'
    ];
    let hash = 0;
    for (let i = 0; i < tradeLower.length; i++) {
      hash = tradeLower.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % avatars.length;
    return avatars[index];
  }

  return null;
}
