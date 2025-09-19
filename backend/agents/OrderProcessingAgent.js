import { z } from 'zod';
import BaseAgent from './BaseAgent.js';
import { supabaseAdmin } from '../config/database.js';

// Input/Output schemas for validation
const orderDataSchema = z.object({
  customerId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    price: z.number()
  })),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string()
  }),
  totalAmount: z.number()
});

const paymentInfoSchema = z.object({
  method: z.enum(['credit_card', 'upi', 'bank_transfer', 'wallet']),
  transactionId: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'completed', 'failed'])
});

const orderProcessingResponseSchema = z.object({
  orderId: z.string(),
  status: z.enum(['created', 'payment_confirmed', 'processing', 'failed']),
  inventoryStatus: z.array(z.object({
    productId: z.string(),
    available: z.boolean(),
    remainingStock: z.number()
  })),
  nextSteps: z.array(z.object({
    action: z.string(),
    details: z.string(),
    priority: z.enum(['high', 'medium', 'low'])
  })),
  notifications: z.array(z.object({
    recipient: z.enum(['customer', 'artisan', 'admin']),
    message: z.string(),
    channel: z.enum(['email', 'sms', 'in_app'])
  }))
});

const shipmentTrackingSchema = z.object({
  currentStatus: z.object({
    location: z.string(),
    status: z.string(),
    timestamp: z.string(),
    details: z.string()
  }),
  predictions: z.object({
    estimatedDelivery: z.string(),
    confidence: z.number(),
    potentialDelays: z.array(z.string()).optional()
  }),
  journey: z.array(z.object({
    location: z.string(),
    status: z.string(),
    timestamp: z.string(),
    nextDestination: z.string().optional()
  })),
  notifications: z.array(z.object({
    trigger: z.string(),
    message: z.string(),
    sendAt: z.string()
  }))
});

const returnRequestSchema = z.object({
  orderId: z.string(),
  reason: z.string(),
  condition: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    reason: z.string()
  }))
});

const returnProcessingSchema = z.object({
  returnId: z.string(),
  status: z.enum(['approved', 'pending', 'rejected']),
  refundAmount: z.number(),
  instructions: z.array(z.string()),
  resolution: z.object({
    type: z.enum(['full_refund', 'partial_refund', 'replacement', 'rejected']),
    reason: z.string(),
    nextSteps: z.array(z.string())
  }),
  inventoryUpdates: z.array(z.object({
    productId: z.string(),
    action: z.enum(['restock', 'damage_report', 'quality_check']),
    quantity: z.number()
  }))
});

const inventoryUpdateSchema = z.object({
  changes: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    type: z.enum(['increment', 'decrement', 'set']),
    reason: z.string()
  }))
});

const inventoryResponseSchema = z.object({
  updates: z.array(z.object({
    productId: z.string(),
    oldQuantity: z.number(),
    newQuantity: z.number(),
    status: z.enum(['success', 'failed', 'warning'])
  })),
  alerts: z.array(z.object({
    type: z.enum(['low_stock', 'out_of_stock', 'reorder']),
    productId: z.string(),
    message: z.string(),
    priority: z.enum(['high', 'medium', 'low'])
  })),
  recommendations: z.array(z.object({
    type: z.string(),
    suggestion: z.string(),
    impact: z.string(),
    data: z.record(z.any())
  }))
});

export class OrderProcessingAgent extends BaseAgent {
  constructor() {
    super('orderProcessing');
  }

  /**
   * Process a new order with validation and inventory checks
   */
  async processOrder(orderData, paymentInfo) {
    try {
      // Validate input
      const order = orderDataSchema.parse(orderData);
      const payment = paymentInfoSchema.parse(paymentInfo);

      // Begin transaction
      const { data: { transactionId }, error: txError } = await this.supabase.rpc('begin_transaction');
      if (txError) throw txError;

      try {
        // Define function for structured response
        const functions = [{
          name: 'processOrderRequest',
          description: 'Process order and generate next steps',
          parameters: orderProcessingResponseSchema
        }];

        // Check inventory and process order using AI
        const messages = [
          {
            role: 'user',
            content: JSON.stringify({
              order,
              payment,
              instruction: 'Process the order, validate inventory, and determine next steps.'
            })
          }
        ];

        const result = await this.generateStructuredResponse(messages, functions);
        const processedOrder = orderProcessingResponseSchema.parse(result);

        // Commit transaction if successful
        await this.supabase.rpc('commit_transaction', { transaction_id: transactionId });
        return processedOrder;
      } catch (error) {
        // Rollback transaction on error
        await this.supabase.rpc('rollback_transaction', { transaction_id: transactionId });
        throw error;
      }
    } catch (error) {
      this.logger.error('Error in processOrder:', error);
      throw error;
    }
  }

  /**
   * Track shipment status with AI-powered predictions
   */
  async trackShipment(orderId, trackingNumber) {
    try {
      // Fetch shipping API data
      const shippingData = await this.fetchShippingData(trackingNumber);

      // Define function for structured response
      const functions = [{
        name: 'analyzeShipment',
        description: 'Analyze shipment data and provide tracking insights',
        parameters: shipmentTrackingSchema
      }];

      // Generate tracking insights using AI
      const messages = [
        {
          role: 'user',
          content: JSON.stringify({
            orderId,
            trackingNumber,
            shippingData,
            instruction: 'Analyze shipping data and provide detailed tracking insights with predictions.'
          })
        }
      ];

      const tracking = await this.generateStructuredResponse(messages, functions);
      return shipmentTrackingSchema.parse(tracking);
    } catch (error) {
      this.logger.error('Error in trackShipment:', error);
      throw error;
    }
  }

  /**
   * Handle return requests and process refunds
   */
  async handleReturn(returnRequest, orderDetails) {
    try {
      // Validate input
      const request = returnRequestSchema.parse(returnRequest);

      // Begin transaction
      const { data: { transactionId }, error: txError } = await this.supabase.rpc('begin_transaction');
      if (txError) throw txError;

      try {
        // Define function for structured response
        const functions = [{
          name: 'processReturn',
          description: 'Process return request and determine resolution',
          parameters: returnProcessingSchema
        }];

        // Process return using AI
        const messages = [
          {
            role: 'user',
            content: JSON.stringify({
              request,
              orderDetails,
              instruction: 'Process the return request and determine appropriate resolution.'
            })
          }
        ];

        const result = await this.generateStructuredResponse(messages, functions);
        const processedReturn = returnProcessingSchema.parse(result);

        // Commit transaction if successful
        await this.supabase.rpc('commit_transaction', { transaction_id: transactionId });
        return processedReturn;
      } catch (error) {
        // Rollback transaction on error
        await this.supabase.rpc('rollback_transaction', { transaction_id: transactionId });
        throw error;
      }
    } catch (error) {
      this.logger.error('Error in handleReturn:', error);
      throw error;
    }
  }

  /**
   * Update inventory with intelligent recommendations
   */
  async updateInventory(inventoryChanges, reason) {
    try {
      // Validate input
      const changes = inventoryUpdateSchema.parse(inventoryChanges);

      // Begin transaction
      const { data: { transactionId }, error: txError } = await this.supabase.rpc('begin_transaction');
      if (txError) throw txError;

      try {
        // Define function for structured response
        const functions = [{
          name: 'processInventoryUpdate',
          description: 'Process inventory updates and generate recommendations',
          parameters: inventoryResponseSchema
        }];

        // Process inventory updates using AI
        const messages = [
          {
            role: 'user',
            content: JSON.stringify({
              changes,
              reason,
              instruction: 'Process inventory updates and provide insights and recommendations.'
            })
          }
        ];

        const result = await this.generateStructuredResponse(messages, functions);
        const inventory = inventoryResponseSchema.parse(result);

        // Commit transaction if successful
        await this.supabase.rpc('commit_transaction', { transaction_id: transactionId });
        return inventory;
      } catch (error) {
        // Rollback transaction on error
        await this.supabase.rpc('rollback_transaction', { transaction_id: transactionId });
        throw error;
      }
    } catch (error) {
      this.logger.error('Error in updateInventory:', error);
      throw error;
    }
  }

  /**
   * Helper method to fetch shipping data from external API
   */
  async fetchShippingData(trackingNumber) {
    // Implementation would integrate with actual shipping APIs
    // For now, return mock data
    return {
      status: 'in_transit',
      lastUpdate: new Date().toISOString(),
      locations: []
    };
  }
}

export default OrderProcessingAgent;