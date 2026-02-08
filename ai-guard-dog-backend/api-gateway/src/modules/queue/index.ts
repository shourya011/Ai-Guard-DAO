/**
 * AI Guard DAO - Queue Module Exports
 */

export {
  QueueModule,
  ANALYSIS_HIGH_PRIORITY_QUEUE,
  ANALYSIS_NORMAL_QUEUE,
  ANALYSIS_HIGH_PRIORITY_QUEUE_EVENTS,
  ANALYSIS_NORMAL_QUEUE_EVENTS,
} from './queue.module';

export {
  AnalysisProducerService,
  QUEUE_NAMES,
  AnalysisRedisKeys,
  AnalysisJobData,
  AnalysisJobResult,
  JobPriority,
} from './analysis-producer.service';
