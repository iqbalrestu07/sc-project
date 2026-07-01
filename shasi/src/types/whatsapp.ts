export interface WhatsappTemplate {
    id: string;
    name: string;
    content: string;
    organization_id: string;
    created_at?: string;
    updated_at?: string;
}

export interface WhatsappDevice {
    id: string;
    organization_id: string;
    name: string;
    jid: string;
    status: "connected" | "disconnected";
    created_at: string;
}

export interface Recipient {
    to: string;
    patient_name?: string;
}

export interface BlastRequest {
    template_id: string;
    device_ids: string[];
    audience?: string;
    include_ids?: string[];
    recipients?: Recipient[];
    max_blast?: number;
    region_code?: string;
}

export interface BlastResult {
    total_attempted: number;
    success: number;
}

export interface SendBulkRequest {
    device_id: string;
    recipients: Recipient[];
    template_id?: string;
    message?: string;
}

export interface SendRequest {
    device_id: string;
    to: string;
    message: string;
}
