const { Client, GatewayIntentBits, REST, Routes, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const NUMBER_OF_CHANNELS = 300;
const NUMBER_OF_ROLES = 300;

client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  
  // Enregistrer les slash commands
  const commands = [
    {
      name: 'raid',
      description: 'Raid un serveur avec 300 salons et rôles',
      options: [
        {
          type: 3, // STRING
          name: 'text',
          description: 'Le texte à utiliser pour les noms',
          required: true
        }
      ]
    }
  ];

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  (async () => {
    try {
      await rest.put(Routes.applicationCommands(client.user.id), {
        body: commands
      });
      console.log('📝 Slash commands enregistrées');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des slash commands:', error);
    }
  })();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'raid') {
    const text = interaction.options.getString('text', true);
    const guild = interaction.guild;
    
    if (!guild) {
      return interaction.reply({ content: '⚠️ Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
    }

    // Vérifier les permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '⚠️ Vous devez avoir la permission Administrateur pour utiliser cette commande.', ephemeral: true });
    }

    try {
      await interaction.deferReply({ ephemeral: false });
      
      console.log(`🚀 Commencement du raid sur ${guild.name} avec le texte: "${text}"`);

      // 1. Supprimer tous les salons existants
      console.log('🗑️ Suppression des salons existants...');
      const channelsToDelete = guild.channels.cache.filter(c => c.type !== ChannelType.GuildCategory && c.type !== ChannelType.GuildVoice);
      for (const [key, channel] of channelsToDelete) {
        try {
          await channel.delete();
        } catch (err) {
          console.warn(`⚠️ Impossible de supprimer ${channel.name}:`, err.message);
        }
      }

      // 2. Supprimer tous les rôles existants (sauf @everyone)
      console.log('🗑️ Suppression des rôles existants...');
      const rolesToDelete = guild.roles.cache.filter(role => role.id !== guild.id);
      for (const [key, role] of rolesToDelete) {
        try {
          await role.delete();
        } catch (err) {
          console.warn(`⚠️ Impossible de supprimer le rôle ${role.name}:`, err.message);
        }
      }

      // 3. Renommer le serveur
      console.log('✏️ Renommage du serveur...');
      try {
        await guild.setName(text.substring(0, 100));
      } catch (err) {
        console.warn('⚠️ Impossible de renommer le serveur:', err.message);
      }

      // 4. Créer 300 rôles
      console.log('👥 Création de 300 rôles...');
      for (let i = 0; i < NUMBER_OF_ROLES; i++) {
        try {
          const roleName = `${text} - Rôle ${i + 1}`.substring(0, 100);
          await guild.roles.create({
            name: roleName,
            color: i * 10,
            permissions: 0
          });
        } catch (err) {
          console.warn(`⚠️ Erreur création rôle ${i + 1}:`, err.message);
        }
      }

      // 5. Créer 300 salons texte
      console.log('💬 Création de 300 salons...');
      for (let i = 0; i < NUMBER_OF_CHANNELS; i++) {
        try {
          const channelName = `${text} - Salon ${i + 1}`.substring(0, 100);
          await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
              },
              {
                id: guild.members.me.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              }
            ]
          });
        } catch (err) {
          console.warn(`⚠️ Erreur création salon ${i + 1}:`, err.message);
        }
      }

      console.log('✅ Raid terminé !');
      
      const embed = new EmbedBuilder()
        .setTitle('🎉 Raid Terminé !')
        .setColor(0x00ff00)
        .setDescription(`Le serveur **${guild.name}** a été raidé avec succès.`)
        .addFields(
          { name: '📝 Texte utilisé', value: `"${text}"`, inline: true },
          { name: '📺 Salons créés', value: `${NUMBER_OF_CHANNELS}`, inline: true },
          { name: '👥 Rôles créés', value: `${NUMBER_OF_ROLES}`, inline: true }
        )
        .setFooter({ text: 'Discord Raid Bot' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du raid:', error);
      await interaction.editReply({ content: `❌ Erreur lors du raid: ${error.message}` });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
