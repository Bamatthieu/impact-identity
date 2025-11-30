// Script pour corriger les badges mal attribués
const db = require('../src/services/supabase');

async function fixBadges() {
  console.log('🔧 Correction des badges...\n');

  // 1. Récupérer tous les utilisateurs clients
  const { data: users, error } = await db.supabase
    .from('users')
    .select('id, name, points')
    .eq('role', 'client');

  if (error) {
    console.error('Erreur récupération users:', error);
    return;
  }

  console.log(`📋 ${users.length} utilisateurs à vérifier\n`);

  // 2. Récupérer tous les badges
  const { data: badges } = await db.supabase.from('badges').select('*');
  
  console.log('🎖️ Badges disponibles:');
  badges.forEach(b => {
    let required = 1;
    if (b.description?.includes('première')) {
      required = 1;
    } else {
      const match = b.description?.match(/(\d+)/);
      if (match) required = parseInt(match[1]);
    }
    console.log(`  - ${b.name}: ${required} missions requises (${b.category})`);
  });
  console.log('');

  // 3. Pour chaque utilisateur, vérifier ses badges
  for (const user of users) {
    // Compter les missions complétées
    const { count } = await db.supabase
      .from('applications')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const completedMissions = count || 0;
    const userPoints = user.points || 0;

    // Récupérer les badges actuels de l'utilisateur
    const { data: userBadges } = await db.supabase
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', user.id);
    
    console.log(`👤 ${user.name}: ${userPoints} pts, ${completedMissions} missions, ${userBadges?.length || 0} badges`);

    // Supprimer les badges non mérités
    for (const ub of userBadges || []) {
      const badge = ub.badge;
      if (!badge) continue;

      let deserved = false;
      let missionsRequired = 1;

      if (badge.category === 'mission') {
        if (badge.description?.includes('première')) {
          missionsRequired = 1;
        } else {
          const match = badge.description?.match(/(\d+)/);
          if (match) missionsRequired = parseInt(match[1]);
        }
        
        if (completedMissions >= missionsRequired) {
          deserved = true;
        }
      }
      // Autres catégories: pas attribué automatiquement
      else if (badge.category === 'environment' || badge.category === 'social') {
        // Pour l'instant, on supprime car on n'a pas la logique de vérification
        deserved = false;
      }

      if (!deserved) {
        console.log(`  ❌ Suppression badge non mérité: ${badge.name} (requiert ${missionsRequired} missions, a ${completedMissions})`);
        await db.supabase
          .from('user_badges')
          .delete()
          .eq('user_id', user.id)
          .eq('badge_id', badge.id);
      } else {
        console.log(`  ✅ Badge mérité: ${badge.name}`);
      }
    }
  }

  console.log('\n✅ Correction terminée!');
  process.exit(0);
}

fixBadges().catch(err => {
  console.error(err);
  process.exit(1);
});
