import { Presentation } from './models/Presentation.js';
import { Slide } from './models/Slide.js';
import { Note } from './models/Note.js';
import { CodeExample } from './models/CodeExample.js';

export async function seedDatabase() {
  const existing = await Presentation.findOne({ title: 'Spring Boot REST APIs' });
  if (existing) {
    return existing;
  }

  console.log('[Seed] Seeding sample presentation and runnable code examples...');

  // 1. Create Presentation
  const presentation = await Presentation.create({
    title: 'Spring Boot REST APIs',
    description: 'Comprehensive classroom presentation on building resilient REST services with Spring Boot 3.2 and Java 21.',
    topic: 'Spring Boot REST APIs',
    targetAudience: 'Intermediate',
    language: 'Java',
    framework: 'Spring Boot 3.2',
    slideCount: 5,
    userId: 'trainer_default',
    branding: {
      instituteName: 'TechSummit Academy',
      accentColor: '#6366f1'
    }
  });

  // 2. Create Slides
  const slidesData = [
    {
      slideNumber: 1,
      title: 'Introduction to Spring Boot REST Architecture',
      subtitle: 'Modern Microservices & API Contracts',
      bulletPoints: [
        'Evolution of Spring MVC into modern REST microservices',
        'Decoupling client frontends from backend business capabilities',
        'HTTP verbs: GET, POST, PUT, DELETE, and PATCH conventions'
      ],
      codeSnippet: {
        language: 'java',
        filename: 'Application.java',
        code: '@SpringBootApplication\npublic class RestApiApplication {\n    public static void main(String[] args) {\n        SpringApplication.run(RestApiApplication.class, args);\n    }\n}'
      },
      visualDiagram: {
        diagramType: 'flow',
        labels: ['Client App', 'HTTP Protocol', 'DispatcherServlet', 'Controller Layer']
      }
    },
    {
      slideNumber: 2,
      title: 'Core Annotations: @RestController & @RequestMapping',
      subtitle: 'Mapping Endpoints & JSON Serialization',
      bulletPoints: [
        '@RestController combines @Controller and @ResponseBody',
        'Automatic serialization via Jackson Databind 2.16+',
        'Explicit URI path versioning: /api/v1/courses'
      ],
      codeSnippet: {
        language: 'java',
        filename: 'CourseController.java',
        code: '@RestController\n@RequestMapping("/api/v1/courses")\npublic class CourseController {\n    @GetMapping("/{id}")\n    public ResponseEntity<CourseDto> getCourse(@PathVariable Long id) {\n        return ResponseEntity.ok(courseService.findById(id));\n    }\n}'
      },
      visualDiagram: {
        diagramType: 'stack',
        labels: ['@RestController', 'HandlerMapping', 'HttpMessageConverter', 'JSON Response']
      }
    },
    {
      slideNumber: 3,
      title: 'Building Your First REST API Endpoint',
      subtitle: 'Separation of Concerns: Controller, Service, & DTOs',
      bulletPoints: [
        'Controllers handle request parsing and HTTP response codes',
        'Services encapsulate domain rules and transactional boundaries',
        'Never return raw JPA entities directly to API consumers'
      ],
      codeSnippet: {
        language: 'java',
        filename: 'CourseService.java',
        code: '@Service\npublic class CourseService {\n    public CourseDto findById(Long id) {\n        Course entity = repository.findById(id)\n            .orElseThrow(() -> new CourseNotFoundException(id));\n        return CourseDto.fromEntity(entity);\n    }\n}'
      },
      visualDiagram: {
        diagramType: 'flow',
        labels: ['Client', 'Controller', 'Service', 'Repository', 'Database']
      }
    },
    {
      slideNumber: 4,
      title: 'DTO Validation & Jakarta Constraints',
      subtitle: 'Fail Fast at the Boundary',
      bulletPoints: [
        'Applying @NotBlank, @Min, @Size, and @NotNull annotations',
        'Enabling validation with @Valid on request body parameters',
        'Standardized RFC 7807 ProblemDetail error responses'
      ],
      codeSnippet: {
        language: 'java',
        filename: 'CourseRequest.java',
        code: 'public record CourseRequest(\n    @NotBlank(message = "Title is required")\n    String title,\n    @Min(value = 15, message = "Duration must be at least 15 mins")\n    int durationMinutes\n) {}'
      },
      visualDiagram: {
        diagramType: 'flow',
        labels: ['Request Body', 'Validator Filter', 'Validation Error (400)', 'Service Handler']
      }
    },
    {
      slideNumber: 5,
      title: 'Automated Testing & MockMvc Verification',
      subtitle: 'Contract Testing & Unit Test Verification',
      bulletPoints: [
        'Testing controllers in isolation using @WebMvcTest',
        'Mocking dependencies cleanly with @MockBean',
        'Verifying JSON payloads and HTTP status assertions'
      ],
      codeSnippet: {
        language: 'java',
        filename: 'CourseControllerTest.java',
        code: '@WebMvcTest(CourseController.class)\nclass CourseControllerTest {\n    @Test\n    void shouldReturn200ForValidCourse() throws Exception {\n        mockMvc.perform(get("/api/v1/courses/101"))\n            .andExpect(status().isOk())\n            .andExpect(jsonPath("$.title").value("Spring Boot REST"));\n    }\n}'
      },
      visualDiagram: {
        diagramType: 'flow',
        labels: ['MockMvc Driver', 'Fake HTTP Request', 'Controller Runner', 'Assert 200 OK']
      }
    }
  ];

  for (const s of slidesData) {
    const slide = await Slide.create({
      presentationId: presentation._id,
      ...s
    });

    // Create matching detailed speaker notes
    const note = await Note.create({
      presentationId: presentation._id,
      slideId: slide._id,
      slideNumber: slide.slideNumber,
      slideTitle: slide.title,
      summary: `Slide ${slide.slideNumber} establishes the architectural mechanics of "${slide.title}". Students master how components interact and why separation of concerns prevents brittle API contracts.`,
      detailedExplanation: `Trainers should highlight the transition from legacy Spring MVC views (JSP/Thymeleaf) to RESTful API endpoints. Emphasize that @RestController intrinsically wires @ResponseBody so return types are serialized to JSON without manual Jackson ObjectMapper plumbing. Discuss idempotency rules for GET and PUT vs POST.`,
      speakingScript: `"Welcome to slide ${slide.slideNumber}. When you are designing APIs for thousands of downstream mobile apps and enterprise integrations, your API contract is an immutable promise. Look closely at the annotations on this slide: each one establishes a clear boundary."`,
      practicalExample: `Consider an airline reservation system. When a mobile user checks seat availability, an idempotent GET request reads the seat map. When the user confirms booking, a validated POST creates the reservation. If validation fails, we reject it immediately before initiating payment locks.`,
      keyTerms: [
        { term: 'Inversion of Control (IoC)', definition: 'A software design pattern where the framework controls program execution flow.' },
        { term: 'Serialization', definition: 'The process of translating internal Java object instances into JSON stream format.' },
        { term: 'Idempotence', definition: 'An operation that produces the same side-effect regardless of how many times it is called.' }
      ],
      takeaways: [
        'Always validate incoming payloads before invoking business services.',
        'Use explicit HTTP status codes (200 OK, 201 Created, 400 Bad Request, 404 Not Found).',
        'Write automated MockMvc tests for every single endpoint.'
      ],
      transitionSentence: `With these principles clearly established, let's turn our attention to the next slide to explore real-time implementation.`,
      estimatedSpeakingTime: '3-4 mins',
      userId: 'trainer_default'
    });

    slide.notes = note._id;
    await slide.save();
  }

  // 3. Create Seeded Runnable Code Example (Python & Java)
  await CodeExample.create({
    presentationId: presentation._id,
    title: 'Spring Boot REST Controller Validation Simulation',
    topic: 'Spring Boot REST APIs',
    language: 'python',
    runtimeVersion: 'Python 3.12 (CPython)',
    difficulty: 'Intermediate',
    lessonObjective: 'Implement a fail-fast payload validation engine matching Spring Boot Jakarta Bean Validation constraints.',
    code: `def validate_course_payload(payload):\n    """Validate payload fields before persistence."""\n    required_fields = ["title", "level", "duration_minutes"]\n    for field in required_fields:\n        if field not in payload or not payload[field]:\n            raise ValueError(f"Missing required field: {field}")\n            \n    if payload["duration_minutes"] < 15:\n        raise ValueError("Course duration must be at least 15 minutes")\n        \n    return {\n        "status": "VALIDATED",\n        "id": 101,\n        "title": payload["title"],\n        "level": payload["level"],\n        "duration_minutes": payload["duration_minutes"]\n    }\n\n# Test execution harness\nif __name__ == "__main__":\n    sample = {"title": "Spring Boot REST APIs", "level": "Intermediate", "duration_minutes": 90}\n    result = validate_course_payload(sample)\n    print(f"Validation Result: {result['status']}")\n    print(f"Course: {result['title']} ({result['duration_minutes']} mins)")`,
    explanation: [
      { lineRange: 'Lines 1-8', explanation: 'Checks for presence of all mandatory payload keys before allowing processing.' },
      { lineRange: 'Lines 9-11', explanation: 'Applies business constraint rule: courses must be at least 15 minutes.' },
      { lineRange: 'Lines 20-24', explanation: 'Instantiates test payload, validates, and prints status tokens for automated grading.' }
    ],
    tests: [
      { name: 'Validation Status Assertion', input: '', expectedOutput: 'Validation Result: VALIDATED', assertionType: 'contains' },
      { name: 'Course Title Assertion', input: '', expectedOutput: 'Course: Spring Boot REST APIs', assertionType: 'contains' }
    ],
    isVerified: true,
    lastVerificationDate: new Date(),
    userId: 'trainer_default'
  });

  console.log('[Seed] Database successfully seeded with presentation, slides, notes, and code examples.');
  return presentation;
}
