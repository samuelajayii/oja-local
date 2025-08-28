// lib/pubsub.js
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub({
  projectId: 'oja-local-46990',
});

const TOPIC_NAME = 'message-notifications';

export async function publishMessageNotification(data) {
  try {
    const topic = pubsub.topic(TOPIC_NAME);
    const messageBuffer = Buffer.from(JSON.stringify(data));

    await topic.publishMessage({
      data: messageBuffer,
      attributes: {
        type: 'new-message',
        userId: data.receiverId,
        timestamp: new Date().toISOString(),
      },
    });

    console.log('Message notification published');
  } catch (error) {
    console.error('Error publishing message notification:', error);
  }
}

// api/messages/route.js - Add to your POST handler
export async function POST(request) {
  try {
    const user = await verifyAuthToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, receiverId, listingId } = await request.json();

    // ... existing validation and message creation ...

    const message = await db.message.create({
      data: {
        content,
        senderId: user.uid,
        receiverId,
        listingId
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, avatar: true }
        },
        listing: {
          select: { id: true, title: true }
        }
      }
    });

    // Publish notification via Pub/Sub
    await publishMessageNotification({
      messageId: message.id,
      senderId: message.senderId,
      senderName: message.sender.name,
      receiverId: message.receiverId,
      listingId: message.listingId,
      listingTitle: message.listing.title,
      content: message.content,
      createdAt: message.createdAt,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}