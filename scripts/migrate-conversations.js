// scripts/migrate-conversations.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateConversations() {
  console.log('Starting conversation migration...');
  
  try {
    // Get all existing messages grouped by listing and users
    const messages = await prisma.message.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        listing: {
          select: {
            userId: true
          }
        }
      }
    });

    // Group messages by unique conversation pairs
    const conversationMap = new Map();
    
    for (const message of messages) {
      const listingOwnerId = message.listing.userId;
      const otherUserId = message.senderId === listingOwnerId ? message.receiverId : message.senderId;
      
      // Create a unique key for the conversation
      const conversationKey = `${message.listingId}-${listingOwnerId}-${otherUserId}`;
      
      if (!conversationMap.has(conversationKey)) {
        conversationMap.set(conversationKey, {
          listingId: message.listingId,
          user1Id: listingOwnerId, // Always the listing owner
          user2Id: otherUserId,    // Always the other person
          firstMessageAt: message.createdAt,
          lastMessageAt: message.createdAt,
          messages: []
        });
      }
      
      const conversation = conversationMap.get(conversationKey);
      conversation.messages.push(message.id);
      conversation.lastMessageAt = message.createdAt;
    }

    console.log(`Found ${conversationMap.size} unique conversations`);

    // Create conversations and update messages
    for (const [key, conversationData] of conversationMap) {
      console.log(`Creating conversation: ${key}`);
      
      // Create the conversation
      const conversation = await prisma.conversation.create({
        data: {
          listingId: conversationData.listingId,
          user1Id: conversationData.user1Id,
          user2Id: conversationData.user2Id,
          createdAt: conversationData.firstMessageAt,
          lastMessageAt: conversationData.lastMessageAt
        }
      });

      // Update all messages in this conversation to reference the new conversation
      await prisma.message.updateMany({
        where: {
          id: {
            in: conversationData.messages
          }
        },
        data: {
          conversationId: conversation.id
        }
      });

      console.log(`Updated ${conversationData.messages.length} messages for conversation ${conversation.id}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateConversations();