// Script pour ajouter les colonnes is_volunteer et bonus_points à la table missions
// Et créer la table reports

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mvkfkviaidhgfmotclir.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12a2ZrdmlhaWRoZ2Ztb3RjbGlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQxMjUyOCwiZXhwIjoyMDc5OTg4NTI4fQ.ZWwXoEAKg_RQdadK83dGLsbx6SRz0v1IZWZhguex-5o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumns() {
  console.log('🔧 Ajout des colonnes pour les missions bénévoles...\n');

  try {
    // Essayer d'ajouter la colonne is_volunteer
    const { error: err1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE missions 
        ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE;
      `
    });
    
    if (err1) {
      console.log('⚠️ Colonne is_volunteer peut déjà exister ou erreur RPC:', err1.message);
    } else {
      console.log('✅ Colonne is_volunteer ajoutée');
    }

    // Essayer d'ajouter la colonne bonus_points
    const { error: err2 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE missions 
        ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;
      `
    });
    
    if (err2) {
      console.log('⚠️ Colonne bonus_points peut déjà exister ou erreur RPC:', err2.message);
    } else {
      console.log('✅ Colonne bonus_points ajoutée');
    }

    // Créer la table reports si elle n'existe pas
    const { error: err3 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS reports (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
          reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
          reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          reason VARCHAR(50) NOT NULL,
          details TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (err3) {
      console.log('⚠️ Table reports peut déjà exister ou erreur RPC:', err3.message);
    } else {
      console.log('✅ Table reports créée');
    }

    console.log('\n✅ Migration terminée !');
    console.log('\n📝 Si les colonnes n\'ont pas été ajoutées automatiquement,');
    console.log('exécutez ces commandes SQL dans Supabase SQL Editor:');
    console.log(`
-- Ajouter colonnes à missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;

-- Créer table reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

addColumns();
