CREATE TYPE "public"."budget_type" AS ENUM('flights_only', 'total_trip');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'searching', 'completed', 'saved');--> statement-breakpoint
CREATE TABLE "api_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" varchar(256),
	"method" varchar(10),
	"statusCode" integer,
	"requestBody" json,
	"responseBody" json,
	"errorMessage" text,
	"durationMs" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"uniqueId" varchar(36) NOT NULL,
	"userId" integer,
	"sessionId" varchar(64),
	"tripRequestId" integer,
	"messages" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_sessions_uniqueId_unique" UNIQUE("uniqueId")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"tripRequestId" integer NOT NULL,
	"airline" varchar(128),
	"airlineLogo" varchar(512),
	"flightNumber" varchar(32),
	"departureTime" varchar(32),
	"arrivalTime" varchar(32),
	"returnDepartureTime" varchar(32),
	"returnArrivalTime" varchar(32),
	"stops" integer DEFAULT 0,
	"returnStops" integer DEFAULT 0,
	"duration" varchar(32),
	"returnDuration" varchar(32),
	"flightPrice" numeric(10, 2),
	"hotelEstimate" numeric(10, 2),
	"activityEstimate" numeric(10, 2),
	"totalEstimate" numeric(10, 2),
	"dealScore" numeric(3, 1),
	"currency" varchar(3) DEFAULT 'EUR',
	"bookingUrl" varchar(1024),
	"isEstimate" integer DEFAULT 1,
	"rawData" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"offerId" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"source" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tripRequestId" integer NOT NULL,
	"offerId" integer,
	"name" varchar(256),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"uniqueId" varchar(36) NOT NULL,
	"userId" integer,
	"sessionId" varchar(64),
	"origin" varchar(10),
	"originCity" varchar(128),
	"destination" varchar(10),
	"destinationCity" varchar(128),
	"departureDate" varchar(10),
	"returnDate" varchar(10),
	"travelers" integer DEFAULT 1,
	"tripStyle" varchar(32),
	"budgetType" "budget_type" DEFAULT 'total_trip',
	"totalBudget" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'EUR',
	"flightSplit" integer DEFAULT 50,
	"hotelSplit" integer DEFAULT 35,
	"activitySplit" integer DEFAULT 15,
	"preferences" json,
	"chatMessages" json,
	"status" "status" DEFAULT 'draft',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trip_requests_uniqueId_unique" UNIQUE("uniqueId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"preferredLanguage" varchar(5) DEFAULT 'en',
	"preferredCurrency" varchar(3) DEFAULT 'EUR',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
