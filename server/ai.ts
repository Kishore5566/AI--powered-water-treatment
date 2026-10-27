import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini client if API key is provided
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('[AI Service] Initialized Gemini 3.8 Flash Client.');
  } catch (err) {
    console.error('[AI Service] Failed to initialize GoogleGenAI client:', err);
  }
} else {
  console.log('[AI Service] GEMINI_API_KEY not set or placeholder; Demo Mode simulation engine active.');
}

export interface PlantTelemetryPayload {
  stages: Array<{
    id: string;
    name: string;
    current_flow_rate: number;
    status: string;
    chemical_dosing: string;
  }>;
  sensors: Array<{
    id: string;
    name: string;
    type: string;
    stage_id: string;
    unit: string;
    current_value: number;
    status: string;
    min_threshold: number;
    max_threshold: number;
    warning_min: number;
    warning_max: number;
  }>;
  equipment: Array<{
    id: string;
    name: string;
    type: string;
    stage_id: string;
    status: string;
    vibration_mm_s: number;
    temperature_c: number;
  }>;
  activeAlertsCount: number;
}

export interface GeneratedInsight {
  title: string;
  summary: string;
  stage_id: string;
  confidence: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  supporting_telemetry: Record<string, string>;
  plain_language_explanation: string;
  recommended_action: string;
  estimated_impact: string;
  forecast_summary: string;
  ai_source: 'GEMINI_3_8_FLASH' | 'SIMULATED_DEMO_AI';
  applied_changes: Record<string, string>;
}

export async function analyzeWaterTreatmentTelemetry(telemetry: PlantTelemetryPayload): Promise<{
  insights: GeneratedInsight[];
  overall_assessment: string;
  forecast_trend: string;
  mode: 'LIVE_GEMINI' | 'SIMULATED_DEMO';
}> {
  // If we have an active Gemini client, call Gemini 3.8 Flash
  if (aiClient) {
    try {
      const prompt = `
You are AquaPulse AI, a lead water treatment process engineering AI assistant.
Analyze the following live SCADA telemetry from our municipal water treatment facility:

Current Plant Telemetry:
${JSON.stringify(telemetry, null, 2)}

Tasks:
1. Detect any anomalies, multi-parameter imbalances, or threshold excursions (e.g. pH drifts during coagulation, filter headloss / differential pressure rise, disinfection CT chlorine decay, raw water turbidity changes).
2. Forecast water quality trends over the next 2-4 hours.
3. Recommend concrete, actionable process adjustments that an authorized human operator can review. (Note: AI recommendations NEVER alter settings automatically; a human operator must review and approve).
4. Provide high confidence levels (70-98%) with supporting telemetry, plain language chemical/physical explanations, and estimated plant impact.

Return your response in clean JSON matching this exact structure:
{
  "overall_assessment": "1-2 sentence high-level summary of plant status",
  "forecast_trend": "2-3 sentence forecast of water quality and potential excursions",
  "insights": [
    {
      "title": "Short descriptive title of recommendation",
      "summary": "Brief explanation of the anomaly detected",
      "stage_id": "one of: intake, coagulation, sedimentation, filtration, disinfection, distribution",
      "confidence": 92,
      "urgency": "LOW | MEDIUM | HIGH | CRITICAL",
      "supporting_telemetry": {
        "Metric Name": "Value with unit"
      },
      "plain_language_explanation": "Detailed plain-language reasoning of the water chemistry or mechanical cause",
      "recommended_action": "Exact step operator should execute",
      "estimated_impact": "Quantifiable safety, compliance, or chemical/energy savings impact",
      "forecast_summary": "Expected 2-hour trajectory if unaddressed vs addressed",
      "applied_changes": {
        "Parameter Name": "New Recommended Value"
      }
    }
  ]
}
`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text;
      if (responseText) {
        const parsed = JSON.parse(responseText.trim());
        const insights: GeneratedInsight[] = (parsed.insights || []).map((item: any) => ({
          ...item,
          ai_source: 'GEMINI_3_8_FLASH',
        }));

        return {
          insights,
          overall_assessment: parsed.overall_assessment || 'Plant operating within controlled operational parameters with active advisory optimizations.',
          forecast_trend: parsed.forecast_trend || 'Water quality expected to remain compliant if filter backwash and pH trim adjustments are executed.',
          mode: 'LIVE_GEMINI',
        };
      }
    } catch (err) {
      console.error('[AI Service] Gemini API call error, falling back to realistic simulated model:', err);
    }
  }

  // Realistic Domain Simulation Engine (Always available, clearly labeled)
  return generateRealisticSimulatedInsights(telemetry);
}

function generateRealisticSimulatedInsights(telemetry: PlantTelemetryPayload): {
  insights: GeneratedInsight[];
  overall_assessment: string;
  forecast_trend: string;
  mode: 'SIMULATED_DEMO';
} {
  // Inspect actual telemetry to generate contextual, realistic physics & chemistry insights
  const fltSensor = telemetry.sensors.find((s) => s.id === 'SNS-FLT-DP03' || s.type === 'Differential Pressure');
  const coaSensor = telemetry.sensors.find((s) => s.id === 'SNS-COA-PH01' || (s.stage_id === 'coagulation' && s.type === 'pH'));
  const intTbSensor = telemetry.sensors.find((s) => s.id === 'SNS-INT-TB01');
  const disClSensor = telemetry.sensors.find((s) => s.id === 'SNS-DIS-CL01');
  const eqMixer = telemetry.equipment.find((e) => e.id === 'EQ-MIX-201');

  const insights: GeneratedInsight[] = [];

  // Insight 1: Coagulation pH optimization
  const coaVal = coaSensor?.current_value || 6.42;
  insights.push({
    title: 'Trim Caustic Soda Dosing (+0.5 mg/L) to Re-center Coagulation pH at 6.70',
    summary: `Coagulation pH (${coaVal.toFixed(2)}) is bordering the lower boundary of optimal sweep flocculation (6.50 - 7.00).`,
    stage_id: 'coagulation',
    confidence: 93,
    urgency: coaVal < 6.4 ? 'HIGH' : 'MEDIUM',
    supporting_telemetry: {
      'Rapid Mix pH': `${coaVal.toFixed(2)} pH (Target: 6.65)`,
      'Raw Water Turbidity': `${intTbSensor?.current_value || 18.4} NTU`,
      'Current Caustic Soda Feed': '4.2 mg/L',
      'Alum Dosage': '28.5 mg/L',
    },
    plain_language_explanation: 'Alum coagulant releases acidic hydrogen ions during hydrolysis. When raw water buffer capacity is moderately low, the pH drops below 6.50, causing pin-point floc rather than heavy settleable macroflocs. A modest caustic soda boost restores the ideal hydroxide precipitation zone without scaling downstream membranes.',
    recommended_action: 'Increase Caustic Soda metering pump setpoint from 4.2 mg/L to 4.7 mg/L.',
    estimated_impact: 'Improves sedimentation clarifier solids settling by 16%, lowering solids loading onto filter beds.',
    forecast_summary: 'Without adjustment, sedimentation effluent turbidity will rise above 2.5 NTU in ~90 minutes.',
    ai_source: 'SIMULATED_DEMO_AI',
    applied_changes: {
      'Caustic Soda (pH trim)': '4.7 mg/L',
    },
  });

  // Insight 2: Filter backwash trigger
  const dpVal = fltSensor?.current_value || 7.6;
  insights.push({
    title: 'Schedule Automated Backwash Cycle for Filter Cell #3',
    summary: `Filter Bed #3 differential headloss has reached ${dpVal.toFixed(1)} psi, indicating deep-bed solids accumulation.`,
    stage_id: 'filtration',
    confidence: 97,
    urgency: dpVal > 7.0 ? 'HIGH' : 'MEDIUM',
    supporting_telemetry: {
      'Filter #3 Headloss': `${dpVal.toFixed(1)} psi (Warning threshold: 6.5 psi)`,
      'Filter Cell Turbidity': '0.28 NTU (EPA limit: 0.30 NTU)',
      'Cumulative Bed Run Time': '49.2 hours',
      'Filtration Rate': '3.2 gpm/sq.ft',
    },
    plain_language_explanation: 'As solids accumulate across the dual-media anthracite and garnet layers, inter-granular pore throat velocity increases. When headloss exceeds 7.5 psi, the shear force begins detaching trapped colloids, leading to sudden turbidity breakthrough.',
    recommended_action: 'Authorize operator backwash sequence: initiate 3-minute surface air scour followed by 9-minute fluidization backwash.',
    estimated_impact: 'Restores initial clean bed differential pressure to 1.1 psi and preserves finished water turbidity < 0.10 NTU.',
    forecast_summary: 'Breakthrough risk elevates to 88% probability within the next 45 to 90 minutes if backwash is deferred.',
    ai_source: 'SIMULATED_DEMO_AI',
    applied_changes: {
      'Filter Bed #3 Mode': 'AUTOMATED_BACKWASH',
    },
  });

  // Insight 3: Disinfection residual trim & chemical savings
  const clVal = disClSensor?.current_value || 2.15;
  insights.push({
    title: 'Optimize Sodium Hypochlorite Feed (-0.2 mg/L) for Seasonal Chlorine Demand',
    summary: `Contact basin free chlorine residual (${clVal.toFixed(2)} mg/L) comfortably exceeds target disinfection CT safety requirements.`,
    stage_id: 'disinfection',
    confidence: 89,
    urgency: 'LOW',
    supporting_telemetry: {
      'Disinfection Basin Chlorine': `${clVal.toFixed(2)} mg/L`,
      'Calculated Log-Giardia Inactivation': '3.8 logs (Required: 3.0 logs)',
      'Distribution Entry Chlorine': '1.62 mg/L',
      'Water Temperature': '16.8 °C',
    },
    plain_language_explanation: 'Due to low organic precursors and cooler autumn raw water, natural chlorine demand in the contact basin has subsided by 11%. Trimming the primary dosing maintains full 4-log virus and 3-log Giardia compliance while preventing trihalomethane (THM) disinfection byproduct formation.',
    recommended_action: 'Trim primary Sodium Hypochlorite dosage rate from 2.6 mg/L to 2.4 mg/L.',
    estimated_impact: 'Reduces monthly hypochlorite procurement expenditure by ~$4,200 while preserving water taste quality.',
    forecast_summary: 'Distribution point-of-entry residual will stabilize at an optimal 1.45 mg/L.',
    ai_source: 'SIMULATED_DEMO_AI',
    applied_changes: {
      'Sodium Hypochlorite (12.5%)': '2.4 mg/L',
    },
  });

  // Insight 4: Mechanical vibration on Mixer
  if (eqMixer && eqMixer.vibration_mm_s > 2.5) {
    insights.push({
      title: 'Proactive Bearing Greasing & Alignment for Rapid Mixer A',
      summary: `Rapid Mixer A vibration (${eqMixer.vibration_mm_s} mm/s) shows 2X baseline harmonic signature, indicative of bearing wear.`,
      stage_id: 'coagulation',
      confidence: 91,
      urgency: 'HIGH',
      supporting_telemetry: {
        'Vibration Velocity': `${eqMixer.vibration_mm_s} mm/s (Alarm: 3.0 mm/s)`,
        'Housing Temperature': `${eqMixer.temperature_c} °C`,
        'Asset Runtime': `${eqMixer.status} - 6,140 hrs`,
      },
      plain_language_explanation: 'Elevated vibration at rotational shaft frequencies indicates premature raceway spalling or insufficient polyurea grease. Early lubrication prevents catastrophic shaft seizure during peak flow demand.',
      recommended_action: 'Dispatch technician to apply NLGI Grade 2 synthetic bearing grease and verify coupling backlash.',
      estimated_impact: 'Prevents unplanned emergency downtime of primary coagulation rapid mix chamber.',
      forecast_summary: 'Continued operation without lubrication will force unexpected motor trip within 72 hours.',
      ai_source: 'SIMULATED_DEMO_AI',
      applied_changes: {
        'Work Order Generated': 'TSK-2026-090 Scheduled',
      },
    });
  }

  return {
    insights,
    overall_assessment: 'Plant hydraulic flow is steady at 24.2 MGD with 98.4% overall compliance index. Filter headloss accumulation requires near-term backwash cycle.',
    forecast_trend: 'Turbidity and disinfection residuals remain stable. Predictive analysis warns of filter breakthrough risk if Cell #3 backwash is delayed past 90 minutes.',
    mode: 'SIMULATED_DEMO',
  };
}
