import type {
  AppointmentRepository,
  AuditLogger,
  Clock,
  ConsentRepository,
  DoctorCatalogue,
  EmailNotifier,
  IdGenerator,
  IdempotencyStore,
  PatientRepository,
  ServiceCatalogue,
  SignedUrlMinter,
  SlotLockService,
  SmsNotifier,
  TelehealthRoomFactory,
  TmsScreeningRepository,
  UploadTokenMinter,
  WhatsappNotifier,
} from '../application/ports/index.js';
import type { Env, WorkerCtx } from '../interfaces/workers/env.js';
import { token } from './container.js';

/** Token registry — every adapter and infra value resolved by these. */
export const T = {
  Env: token<Env>('Env'),
  WorkerCtx: token<WorkerCtx>('WorkerCtx'),
  Clock: token<Clock>('Clock'),
  IdGenerator: token<IdGenerator>('IdGenerator'),

  // Repositories
  PatientRepository: token<PatientRepository>('PatientRepository'),
  AppointmentRepository: token<AppointmentRepository>('AppointmentRepository'),
  ConsentRepository: token<ConsentRepository>('ConsentRepository'),
  TmsScreeningRepository: token<TmsScreeningRepository>('TmsScreeningRepository'),
  ServiceCatalogue: token<ServiceCatalogue>('ServiceCatalogue'),

  // Slot/concurrency
  SlotLockService: token<SlotLockService>('SlotLockService'),

  // Notifiers
  EmailNotifier: token<EmailNotifier>('EmailNotifier'),
  SmsNotifier: token<SmsNotifier>('SmsNotifier'),
  WhatsappNotifier: token<WhatsappNotifier>('WhatsappNotifier'),

  // Misc
  TelehealthRoomFactory: token<TelehealthRoomFactory>('TelehealthRoomFactory'),
  AuditLogger: token<AuditLogger>('AuditLogger'),
  IdempotencyStore: token<IdempotencyStore>('IdempotencyStore'),
  SignedUrlMinter: token<SignedUrlMinter>('SignedUrlMinter'),
  UploadTokenMinter: token<UploadTokenMinter>('UploadTokenMinter'),
  DoctorCatalogue: token<DoctorCatalogue>('DoctorCatalogue'),
} as const;
