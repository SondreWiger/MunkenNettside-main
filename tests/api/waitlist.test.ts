import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: '1', title: 'Test' }, error: null })),
        maybeSingle: vi.fn(() => ({ data: null, error: null })),
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: '1' }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ data: { id: '1' }, error: null })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null })),
    })),
  })),
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(() => mockSupabase),
  getSupabaseAdminClient: vi.fn(() => mockSupabase),
}))

describe('Waitlist API - Ensemble', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add user to waitlist', async () => {
    const mockRequest = {
      json: async () => ({ userId: 'user-123' }),
    } as any

    // Import after mocks are set up
    const { POST } = await import('@/app/api/ensembles/[id]/waitlist/route')
    
    const response = await POST(mockRequest, { params: { id: 'ensemble-1' } })
    const data = await response.json()

    expect(mockSupabase.from).toHaveBeenCalledWith('ensemble_waitlist')
    expect(data).toHaveProperty('success')
  })

  it('should get waitlist entries', async () => {
    const mockRequest = {} as any

    const { GET } = await import('@/app/api/ensembles/[id]/waitlist/route')
    
    const response = await GET(mockRequest, { params: { id: 'ensemble-1' } })
    const data = await response.json()

    expect(mockSupabase.from).toHaveBeenCalledWith('ensemble_waitlist')
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('Waitlist API - Kurs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add user to kurs waitlist', async () => {
    const mockRequest = {
      json: async () => ({ userId: 'user-123' }),
    } as any

    const { POST } = await import('@/app/api/kurs/[id]/waitlist/route')
    
    const response = await POST(mockRequest, { params: { id: 'kurs-1' } })
    const data = await response.json()

    expect(mockSupabase.from).toHaveBeenCalledWith('kurs_waitlist')
    expect(data).toHaveProperty('success')
  })
})
