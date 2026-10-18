import { Lead, CallLog, Task, Template, ActivityEvent, ImportBatch } from '../types'
import { calculateLeadScore, DEFAULT_SCORING_RULES } from '../lib/scoring'
import { normalizePhone } from '../lib/phone'
import { addDays, subDays, setHours, setMinutes } from 'date-fns'

const now = new Date()

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tmpl-script-1',
    type: 'script',
    name: 'Standard Cold Intro Pitch',
    body: `Hello! Am I speaking with the management or doctor at {business_name}?

Hi there, I'm calling from Leadonic. We help leading businesses in {area} automate their customer follow-ups and capture high-intent inquiries from Google and Instagram.

We recently helped a nearby clinic in {area} double their repeat booking rate in 30 days. Would you be open to a quick 5-minute preview of how this works for {business_name}?`,
    isDefault: true,
  },
  {
    id: 'tmpl-script-2',
    type: 'script',
    name: 'Callback / Follow-up Reconnect',
    body: `Hi, good day! Reconnecting from Leadonic for {business_name}.

We spoke briefly earlier regarding your lead capture & retention in {area}. As promised, I wanted to follow up at a convenient time.

Do you have 2 minutes now to look at the quick demo link we prepared specifically for {business_name}?`,
    isDefault: false,
  },
  {
    id: 'tmpl-whatsapp-1',
    type: 'whatsapp',
    name: 'Quick WhatsApp Introduction',
    body: `Hi {business_name} Team! 👋

I'm Vijay from Leadonic. We work with premium brands and service centers in {area} to turn website & Google visitors into booked clients on WhatsApp.

Would love to share a short 60-second video demo showing how similar businesses in {area} increased inquiries by 40%.

Can I send over the link here?`,
    isDefault: true,
  },
  {
    id: 'tmpl-whatsapp-2',
    type: 'whatsapp',
    name: 'Post-Call Proposal Summary',
    body: `Hi {business_name} Team! Great speaking with you today.

As discussed, here is the executive summary on how Leadonic helps {area} businesses automate customer acquisition and smart reminders.

Feel free to check our catalog or reply here anytime if you have any questions! 🚀`,
    isDefault: false,
  },
  {
    id: 'tmpl-email-1',
    type: 'email',
    name: 'Formal Partnership Proposal',
    body: `Subject: Growth Opportunity for {business_name} in {area}

Dear Team at {business_name},

I hope this email finds you well.

We have been observing the stellar growth and positive reviews of {business_name} in {area}. At Leadonic, we specialize in high-conversion pipeline automation for premium businesses.

I'd love to schedule a brief 10-minute briefing to share insights we observed in {area}.

Warm regards,
Leadonic Growth Team`,
    isDefault: false,
  },
]

interface RawBusinessSeed {
  name: string
  phone: string
  address: string
  category: string
  website: string
  rating: number
  reviews: number
  area: 'Indiranagar' | 'Koramangala' | 'HSR Layout'
  status?: 'New' | 'Contacted' | 'Interested' | 'Lost'
  doNotCall?: boolean
}

const RAW_SEEDS: RawBusinessSeed[] = [
  // Indiranagar (20 leads)
  { name: 'Dr. Smile Dental Studio & Aesthetics', phone: '+919845101001', address: '100ft Rd, HAL 2nd Stage', category: 'Dental Clinic', website: 'https://drsmileblore.com', rating: 4.8, reviews: 142, area: 'Indiranagar', status: 'Interested' },
  { name: 'Indira Family Dental Care', phone: '+919845101002', address: '12th Main, 4th Cross', category: 'Dental Clinic', website: 'https://indiradental.in', rating: 4.5, reviews: 68, area: 'Indiranagar', status: 'Contacted' },
  { name: 'Prestige Landmark Realty Partners', phone: '+919845101003', address: 'CMH Road, Indiranagar', category: 'Real Estate Agency', website: 'https://prestigelandmarkblr.com', rating: 4.6, reviews: 92, area: 'Indiranagar', status: 'Interested' },
  { name: 'Metropolis Living Spaces', phone: '+919845101004', address: '6th Main, Defense Colony', category: 'Real Estate Agency', website: 'https://metropolisliving.in', rating: 4.1, reviews: 34, area: 'Indiranagar', status: 'New' },
  { name: 'Third Wave Coffee Roasters', phone: '+919845101005', address: '80ft Road, HAL 3rd Stage', category: 'Boutique Cafe', website: 'https://thirdwavecoffee.in', rating: 4.7, reviews: 310, area: 'Indiranagar', status: 'Contacted' },
  { name: 'The Artisanal Bean & Bistro', phone: '+919845101006', address: '100ft Road, near Metro', category: 'Boutique Cafe', website: '', rating: 4.3, reviews: 88, area: 'Indiranagar', status: 'New' },
  { name: 'CultFit Elite Fitness Club', phone: '+919845101007', address: '100ft Road, 1st Stage', category: 'Gym & Fitness', website: 'https://cultfitindiranagar.com', rating: 4.9, reviews: 420, area: 'Indiranagar', status: 'Interested' },
  { name: 'IronClad Strength & Conditioning', phone: '+919845101008', address: 'Old Airport Road, Kodihalli', category: 'Gym & Fitness', website: 'https://ironcladblr.in', rating: 4.4, reviews: 76, area: 'Indiranagar', status: 'New' },
  { name: 'Chaitanya Medical & IIT Foundation', phone: '+919845101009', address: 'CMH Road', category: 'Coaching Institute', website: 'https://chaitanyafoundation.edu', rating: 4.2, reviews: 54, area: 'Indiranagar', status: 'New' },
  { name: 'Ozone Luxury Salon & Day Spa', phone: '+919845101010', address: '12th Main Road', category: 'Salon & Spa', website: 'https://ozonespa.in', rating: 4.6, reviews: 112, area: 'Indiranagar', status: 'Contacted' },
  { name: 'SpeedyWheels Multi-Brand Motors', phone: '+919845101011', address: 'Old Airport Road', category: 'Auto Services', website: '', rating: 3.8, reviews: 45, area: 'Indiranagar', status: 'New' },
  { name: 'TechMatrix Systems Consulting', phone: '+919845101012', address: '100ft Road, 6th Block', category: 'IT Consulting', website: 'https://techmatrix.co', rating: 4.3, reviews: 29, area: 'Indiranagar', status: 'New' },
  { name: 'Dr. Rao Implant & Orthodontics', phone: '+919845101013', address: '14th Cross, HAL 2nd Stage', category: 'Dental Clinic', website: 'https://raodental.com', rating: 4.7, reviews: 95, area: 'Indiranagar', status: 'New' },
  { name: 'Greenfield Realty Advisors', phone: '+919845101014', address: '80ft Road, near Sony World signal', category: 'Real Estate Agency', website: '', rating: 3.9, reviews: 21, area: 'Indiranagar', status: 'Lost' },
  { name: 'Cafe Noir French Bakery', phone: '+919845101015', address: 'HAL 2nd Stage', category: 'Boutique Cafe', website: 'https://cafenoirblr.com', rating: 4.5, reviews: 184, area: 'Indiranagar', status: 'New' },
  { name: 'FitPulse Yoga & Pilates Studio', phone: '+919845101016', address: '11th Main, Defense Colony', category: 'Gym & Fitness', website: 'https://fitpulseblr.com', rating: 4.6, reviews: 63, area: 'Indiranagar', status: 'New' },
  { name: 'Apex Commerce Tuitions', phone: '+919845101017', address: 'Binnamangala 1st Stage', category: 'Coaching Institute', website: '', rating: 4.0, reviews: 30, area: 'Indiranagar', status: 'New' },
  { name: 'BodyCraft Hair Studio', phone: '+919845101018', address: '100ft Road', category: 'Salon & Spa', website: 'https://bodycraft.co.in', rating: 4.7, reviews: 210, area: 'Indiranagar', status: 'Contacted' },
  { name: 'CarZing Detailing Hub', phone: '+919845101019', address: 'Domlur Flyover junction', category: 'Auto Services', website: 'https://carzingblr.com', rating: 4.4, reviews: 58, area: 'Indiranagar', status: 'New' },
  { name: 'Apex Cloudworks India', phone: '+919845101020', address: '12th Main Road', category: 'IT Consulting', website: 'https://apexcloud.io', rating: 4.5, reviews: 38, area: 'Indiranagar', status: 'New' },

  // Koramangala (20 leads)
  { name: 'SmileCraft Dental Care & Braces', phone: '+919845202001', address: '5th Block, 80ft Road', category: 'Dental Clinic', website: 'https://smilecraftkormangala.com', rating: 4.9, reviews: 175, area: 'Koramangala', status: 'Interested' },
  { name: 'Koramangala Dental Centre', phone: '+919845202002', address: '4th Block, 100ft Road', category: 'Dental Clinic', website: '', rating: 4.1, reviews: 49, area: 'Koramangala', status: 'New' },
  { name: 'UrbanNest Realty & Estates', phone: '+919845202003', address: '6th Block, Industrial Layout', category: 'Real Estate Agency', website: 'https://urbannestrealty.in', rating: 4.7, reviews: 104, area: 'Koramangala', status: 'Contacted' },
  { name: 'Vanguard Commercial Real Estate', phone: '+919845202004', address: '1st Block, 14th Main', category: 'Real Estate Agency', website: 'https://vanguardrealty.co', rating: 4.5, reviews: 82, area: 'Koramangala', status: 'New' },
  { name: 'Dyu Art Cafe & Roastery', phone: '+919845202005', address: '5th Block, KHB Colony', category: 'Boutique Cafe', website: 'https://dyuartcafe.com', rating: 4.8, reviews: 480, area: 'Koramangala', status: 'Contacted' },
  { name: 'Hole in the Wall Cafe', phone: '+919845202006', address: '4th Block, 8th Main', category: 'Boutique Cafe', website: 'https://holeinthewallcafe.com', rating: 4.7, reviews: 520, area: 'Koramangala', status: 'New' },
  { name: 'Snap Fitness 24/7 Koramangala', phone: '+919845202007', address: '7th Block, 80ft Road', category: 'Gym & Fitness', website: 'https://snapfitnesskormangala.in', rating: 4.4, reviews: 130, area: 'Koramangala', status: 'New' },
  { name: 'Treadstone MMA & Cross Training', phone: '+919845202008', address: '3rd Block, Sarjapur Rd', category: 'Gym & Fitness', website: 'https://treadstonemma.com', rating: 4.6, reviews: 67, area: 'Koramangala', status: 'Interested' },
  { name: 'Career Launcher MBA Prep Centre', phone: '+919845202009', address: '5th Block, Jyoti Nivas College Rd', category: 'Coaching Institute', website: 'https://careerlauncherkormangala.com', rating: 4.5, reviews: 145, area: 'Koramangala', status: 'Contacted' },
  { name: 'YLG Salon & Nail Bar', phone: '+919845202010', address: '6th Block, 80ft Road', category: 'Salon & Spa', website: 'https://ylgindia.com', rating: 4.3, reviews: 88, area: 'Koramangala', status: 'New' },
  { name: 'PitStop Car Service Station', phone: '+919845202011', address: 'National Games Village Road', category: 'Auto Services', website: '', rating: 3.7, reviews: 29, area: 'Koramangala', status: 'Lost', doNotCall: true },
  { name: 'HyperStack IT Solutions', phone: '+919845202012', address: '7th Block, Sony World Signal', category: 'IT Consulting', website: 'https://hyperstack.tech', rating: 4.4, reviews: 33, area: 'Koramangala', status: 'New' },
  { name: 'Dr. Thomas Dental Clinic', phone: '+919845202013', address: '1st Block, Wipro Park', category: 'Dental Clinic', website: 'https://drthomasdental.in', rating: 4.6, reviews: 71, area: 'Koramangala', status: 'New' },
  { name: 'Square Yards Premium Properties', phone: '+919845202014', address: '4th Block, 100ft Road', category: 'Real Estate Agency', website: 'https://squareyardsblr.in', rating: 4.2, reviews: 64, area: 'Koramangala', status: 'New' },
  { name: 'The Caffeine Hub & Bakes', phone: '+919845202015', address: '5th Block, 1st Cross', category: 'Boutique Cafe', website: '', rating: 4.1, reviews: 39, area: 'Koramangala', status: 'New' },
  { name: 'Gold’s Gym Elite', phone: '+919845202016', address: '6th Block, Club Road', category: 'Gym & Fitness', website: 'https://goldsgymblr.com', rating: 4.5, reviews: 160, area: 'Koramangala', status: 'New' },
  { name: 'TIME CAT & GATE Academy', phone: '+919845202017', address: '7th Block, Jyoti Nivas Rd', category: 'Coaching Institute', website: 'https://time4educationblr.com', rating: 4.6, reviews: 110, area: 'Koramangala', status: 'Contacted' },
  { name: 'Envi Salon & Spa', phone: '+919845202018', address: 'Nexus Mall, Koramangala', category: 'Salon & Spa', website: 'https://envisalon.com', rating: 4.5, reviews: 140, area: 'Koramangala', status: 'New' },
  { name: 'AutoKraft German Car Specialist', phone: '+919845202019', address: '8th Block, near Passport Office', category: 'Auto Services', website: 'https://autokraftblr.in', rating: 4.3, reviews: 52, area: 'Koramangala', status: 'New' },
  { name: 'Quantix AI Engineering Lab', phone: '+919845202020', address: '3rd Block, 18th Main', category: 'IT Consulting', website: 'https://quantixlab.com', rating: 4.7, reviews: 41, area: 'Koramangala', status: 'Interested' },

  // HSR Layout (20 leads)
  { name: 'Partha Dental Clinic & Implant Centre', phone: '+919845303001', address: 'Sector 1, 27th Main', category: 'Dental Clinic', website: 'https://parthadentalhsr.in', rating: 4.8, reviews: 162, area: 'HSR Layout', status: 'Interested' },
  { name: 'Clove Dental HSR Sector 6', phone: '+919845303002', address: 'Sector 6, 14th Main', category: 'Dental Clinic', website: 'https://clovedental.com', rating: 4.6, reviews: 118, area: 'HSR Layout', status: 'Contacted' },
  { name: 'Skyline Luxury Homes & Villas', phone: '+919845303003', address: 'Sector 2, 19th Main', category: 'Real Estate Agency', website: 'https://skylinehomesblr.in', rating: 4.7, reviews: 97, area: 'HSR Layout', status: 'Interested' },
  { name: 'HSR Property Hub', phone: '+919845303004', address: 'Sector 3, 24th Main', category: 'Real Estate Agency', website: '', rating: 3.9, reviews: 26, area: 'HSR Layout', status: 'New' },
  { name: 'Go Native Eco Cafe & Boutique', phone: '+919845303005', address: 'Sector 4, 14th Main', category: 'Boutique Cafe', website: 'https://gonative.in', rating: 4.7, reviews: 290, area: 'HSR Layout', status: 'Contacted' },
  { name: 'Theobroma Patisserie & Cafe', phone: '+919845303006', address: 'Sector 6, 27th Main', category: 'Boutique Cafe', website: 'https://theobroma.in', rating: 4.6, reviews: 340, area: 'HSR Layout', status: 'New' },
  { name: 'F45 Training HSR Layout', phone: '+919845303007', address: 'Sector 1, 19th Main', category: 'Gym & Fitness', website: 'https://f45hsrlayout.com', rating: 4.8, reviews: 155, area: 'HSR Layout', status: 'Interested' },
  { name: 'Chisel Fitness Studio', phone: '+919845303008', address: 'Sector 7, 5th Main', category: 'Gym & Fitness', website: 'https://chiselfitness.com', rating: 4.3, reviews: 78, area: 'HSR Layout', status: 'New' },
  { name: 'Allen Career Institute HSR', phone: '+919845303009', address: 'Sector 2, Outer Ring Road', category: 'Coaching Institute', website: 'https://allen.ac.in', rating: 4.7, reviews: 230, area: 'HSR Layout', status: 'Contacted' },
  { name: 'Toni & Guy Essensuals Hairdressing', phone: '+919845303010', address: 'Sector 1, 27th Main', category: 'Salon & Spa', website: 'https://toniandguyblr.in', rating: 4.5, reviews: 125, area: 'HSR Layout', status: 'New' },
  { name: 'Express Car Wash & Detailing Studio', phone: '+919845303011', address: 'Sector 4, 17th Cross', category: 'Auto Services', website: '', rating: 4.1, reviews: 47, area: 'HSR Layout', status: 'New' },
  { name: 'NexusScale Systems & Cloud', phone: '+919845303012', address: 'Sector 3, 27th Main', category: 'IT Consulting', website: 'https://nexusscale.io', rating: 4.6, reviews: 36, area: 'HSR Layout', status: 'New' },
  { name: 'Roots Micro-Dentistry & Implants', phone: '+919845303013', address: 'Sector 5, 12th Main', category: 'Dental Clinic', website: 'https://rootsdentistry.in', rating: 4.7, reviews: 89, area: 'HSR Layout', status: 'New' },
  { name: 'PrimeAcres Land Advisory', phone: '+919845303014', address: 'Sector 7, 24th Main', category: 'Real Estate Agency', website: 'https://primeacres.in', rating: 4.4, reviews: 54, area: 'HSR Layout', status: 'New' },
  { name: 'Brew & Bite Artisanal Coffee', phone: '+919845303015', address: 'Sector 2, 17th Cross', category: 'Boutique Cafe', website: '', rating: 4.2, reviews: 65, area: 'HSR Layout', status: 'New' },
  { name: 'Volt Fitness & Calisthenics Arena', phone: '+919845303016', address: 'Sector 3, 19th Main', category: 'Gym & Fitness', website: 'https://voltarena.com', rating: 4.5, reviews: 92, area: 'HSR Layout', status: 'New' },
  { name: 'Aakash Byju’s Medical Prep', phone: '+919845303017', address: 'Sector 1, 27th Main', category: 'Coaching Institute', website: 'https://aakash.ac.in', rating: 4.6, reviews: 180, area: 'HSR Layout', status: 'Contacted' },
  { name: 'Kapil’s Salon & Wellness Clinic', phone: '+919845303018', address: 'Sector 4, 19th Main', category: 'Salon & Spa', website: 'https://kapilssalon.in', rating: 4.4, reviews: 83, area: 'HSR Layout', status: 'New' },
  { name: 'WheelsOnFire Multi-brand Auto Repair', phone: '+919845303019', address: 'Sector 2, near Agara Lake', category: 'Auto Services', website: '', rating: 3.8, reviews: 24, area: 'HSR Layout', status: 'Lost' },
  { name: 'Synapse Data Networks', phone: '+919845303020', address: 'Sector 6, Outer Ring Road', category: 'IT Consulting', website: 'https://synapsedata.co', rating: 4.4, reviews: 30, area: 'HSR Layout', status: 'New' },
]

export function generateSeedData(): {
  leads: Lead[]
  calls: CallLog[]
  tasks: Task[]
  templates: Template[]
  batches: ImportBatch[]
  activities: ActivityEvent[]
} {
  const batchId = 'batch_seed_blr_01'
  const leads: Lead[] = []
  const calls: CallLog[] = []
  const tasks: Task[] = []
  const activities: ActivityEvent[] = []

  const batch: ImportBatch = {
    id: batchId,
    fileName: 'bangalore_prime_businesses_phase1.xlsx',
    area: 'All Areas (Indiranagar, Koramangala, HSR Layout)',
    date: subDays(now, 5).toISOString(),
    added: 60,
    skipped: 0,
    errors: 0,
    leadsCount: 60,
  }

  RAW_SEEDS.forEach((raw, i) => {
    const id = `lead_${String(i + 1).padStart(3, '0')}`
    const norm = normalizePhone(raw.phone)
    const normalizedPhone = norm.e164 || raw.phone
    const status = raw.status || 'New'
    const doNotCall = raw.doNotCall || false

    // Initial follow-up timing
    let nextFollowup: string | null = null
    let callCount = 0
    let lastCalledAt: string | null = null

    // Set realistic follow-ups for Contacted and Interested
    if (status === 'Interested') {
      callCount = 2
      lastCalledAt = subDays(now, 1).toISOString()
      // Due today or tomorrow
      if (i % 2 === 0) {
        nextFollowup = setMinutes(setHours(now, 11), 30).toISOString() // Today!
      } else {
        nextFollowup = setMinutes(setHours(addDays(now, 1), 14), 0).toISOString() // Tomorrow
      }
    } else if (status === 'Contacted') {
      callCount = 1
      lastCalledAt = subDays(now, 2).toISOString()
      if (i % 3 === 0) {
        nextFollowup = setMinutes(setHours(subDays(now, 1), 15), 0).toISOString() // Overdue!
      } else {
        nextFollowup = setMinutes(setHours(addDays(now, 2), 10), 0).toISOString()
      }
    }

    const scoreResult = calculateLeadScore(
      {
        rating: raw.rating,
        website: raw.website,
        category: raw.category,
        status: status,
      },
      DEFAULT_SCORING_RULES
    )

    const createdAt = subDays(now, 5).toISOString()

    const lead: Lead = {
      id,
      name: raw.name,
      phone: normalizedPhone,
      rawPhone: raw.phone,
      address: raw.address,
      category: raw.category,
      website: raw.website,
      rating: raw.rating,
      reviews: raw.reviews,
      area: raw.area,
      batchId,
      status,
      score: scoreResult.total,
      doNotCall,
      nextFollowup,
      lastCalledAt,
      callCount,
      createdAt,
    }

    leads.push(lead)

    // Add activity event for creation
    activities.push({
      id: `act_init_${id}`,
      leadId: id,
      type: 'import',
      text: `Imported from initial Bangalore batch (${raw.area})`,
      at: createdAt,
    })

    // If already called, add CallLog and activity
    if (callCount > 0) {
      const callLogId = `call_${id}_1`
      const outcome = status === 'Interested' ? 'Interested' : 'Callback'
      const callTime = lastCalledAt || subDays(now, 1).toISOString()

      calls.push({
        id: callLogId,
        leadId: id,
        outcome,
        notes:
          status === 'Interested'
            ? 'Spoke with the owner. Highly receptive to appointment automation demo.'
            : 'Requested a callback during non-peak afternoon hours.',
        calledAt: callTime,
        followupDate: nextFollowup,
      })

      activities.push({
        id: `act_call_${id}`,
        leadId: id,
        type: 'call',
        text: `Call logged: "${outcome}". Notes: ${status === 'Interested' ? 'Owner interested in demo' : 'Requested callback'}`,
        at: callTime,
      })
    }

    // If follow-up exists, add task
    if (nextFollowup) {
      const taskId = `task_${id}`
      tasks.push({
        id: taskId,
        leadId: id,
        title: `Follow up with ${lead.name} (${lead.category})`,
        dueDate: nextFollowup,
        done: false,
        createdAt: lastCalledAt || createdAt,
        leadName: lead.name,
        leadPhone: lead.phone,
        leadArea: lead.area,
      })

      activities.push({
        id: `act_task_${id}`,
        leadId: id,
        type: 'task',
        text: `Scheduled follow-up reminder for ${nextFollowup}`,
        at: lastCalledAt || createdAt,
      })
    }
  })

  return {
    leads,
    calls,
    tasks,
    templates: DEFAULT_TEMPLATES,
    batches: [batch],
    activities,
  }
}
