export interface WhatsappTemplate {
    id: string;
    name: string;
    content: string;
    organization_id: string;
    created_at?: string;
    updated_at?: string;
}

export interface WhatsappStatusResponse {
    connected: boolean;
}

export interface Recipient {
    to: string;
    patient_name?: string;
}

export interface BlastRequest {
    template_id: string;
    recipients: Recipient[];
    max_blast: number;
    region_code: string;
}

export interface BlastResult {
    total_attempted: number;
    success: number;
}

export interface SendBulkRequest {
    recipients: Recipient[];
    message: string;
}
