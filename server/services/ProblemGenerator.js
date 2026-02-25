// Problem Generator Service
// Generates math problems using templates and AI

class ProblemGenerator {
    constructor() {
        this.supabase = require('../supabase');
        this.problemCounter = 0; // Counter for unique seeds
    }

    // Main method: Generate problems for a session
    async generateProblems(sessionId, roomCode, topics, difficulty, count) {
        const problems = [];

        for (let i = 0; i < count; i++) {
            const topic = topics[i % topics.length]; // Rotate through topics

            try {
                // Try template-based generation first
                let problem = this.generateFromTemplate(topic, difficulty);

                // Fallback to AI if template not available (future implementation)
                if (!problem) {
                    console.log(`No template for ${topic}, using fallback...`);
                    problem = this.generateFallback(topic, difficulty);
                }

                // Shuffling: Randomly swap the correct answer 'A' with another option
                problem = this.shuffleOptions(problem);

                // Increment counter for next problem's unique seed
                this.problemCounter++;

                // Save to Supabase
                const { data, error: insertError } = await this.supabase
                    .from('session_problems')
                    .insert([
                        {
                            session_id: sessionId,
                            room_code: roomCode,
                            problem_number: i + 1,
                            topic: topic,
                            difficulty: difficulty,
                            question_text: problem.question,
                            option_a: problem.options.A,
                            option_b: problem.options.B,
                            option_c: problem.options.C,
                            option_d: problem.options.D,
                            correct_answer: problem.correctAnswer,
                            explanation: problem.explanation
                        }
                    ])
                    .select()
                    .single();

                if (insertError) throw insertError;

                problems.push({ id: data.id, number: i + 1, ...problem });
                console.log(`✅ Generated problem ${i + 1}/${count}: ${topic}`);

            } catch (error) {
                console.error(`Error generating problem ${i + 1}:`, error);
            }
        }

        return problems;
    }

    // Template-based generator
    generateFromTemplate(topic, difficulty) {
        const generators = {
            'Persamaan Kuadrat': () => this.generateQuadratic(difficulty),
            'SPLDV': () => this.generateLinearSystem2Var(difficulty),
            'SPLTV': () => this.generateLinearSystem3Var(difficulty),
            'Trigonometri': () => this.generateTrigonometry(difficulty),
            'Limit Fungsi': () => this.generateLimit(difficulty),
            'Barisan dan Deret': () => this.generateSequence(difficulty),
            'Matriks': () => this.generateMatrix(difficulty),
            'Operasi Bilangan Real': () => this.generateRealNumbers(difficulty),
            'Persamaan Lingkaran': () => this.generateCircle(difficulty),
            'Fungsi Invers': () => this.generateInverseFunction(difficulty),
            'Komposisi Fungsi': () => this.generateCompositeFunction(difficulty),
            'Peluang': () => this.generateProbability(difficulty),
            'Statistika': () => this.generateStatistics(difficulty),
            'Diferensial': () => this.generateDifferential(difficulty),
            'Integral': () => this.generateIntegral(difficulty),
        };

        const generator = generators[topic];
        return generator ? generator() : null;
    }

    // Seeded random number generator - now uses unique counter for each problem
    random(min, max, seed = null) {
        // Use counter + timestamp + provided seed for uniqueness
        const uniqueSeed = (seed || 0) + this.problemCounter * 1000 + Date.now();
        const x = Math.sin(uniqueSeed) * 10000;
        const random = x - Math.floor(x);
        return Math.floor(random * (max - min + 1)) + min;
    }

    // ===== TEMPLATE GENERATORS =====

    // 1. Persamaan Kuadrat Generator
    generateQuadratic(difficulty) {
        const seed = Date.now();
        let a, b, c;

        if (difficulty === 'Easy') {
            a = 1;
            b = this.random(-10, 10, seed);
            c = this.random(-10, 10, seed + 1);
        } else if (difficulty === 'Medium') {
            a = this.random(1, 5, seed);
            b = this.random(-15, 15, seed + 1);
            c = this.random(-20, 20, seed + 2);
        } else { // Hard or Expert
            a = this.random(2, 10, seed);
            b = this.random(-30, 30, seed + 1);
            c = this.random(-50, 50, seed + 2);
        }

        // Calculate discriminant
        const D = b * b - 4 * a * c;

        // Ensure real roots exist
        if (D < 0) {
            c = -Math.abs(c);
        }

        const newD = b * b - 4 * a * c;
        const x1 = (-b + Math.sqrt(newD)) / (2 * a);
        const x2 = (-b - Math.sqrt(newD)) / (2 * a);

        // Format equation
        const bSign = b >= 0 ? '+' : '';
        const cSign = c >= 0 ? '+' : '';
        const equation = `${a}x² ${bSign}${b}x ${cSign}${c} = 0`;

        return {
            question: `Tentukan akar-akar dari persamaan ${equation}`,
            options: {
                A: `x₁ = ${x1.toFixed(2)}, x₂ = ${x2.toFixed(2)}`,
                B: `x₁ = ${(-x1).toFixed(2)}, x₂ = ${(-x2).toFixed(2)}`,
                C: `x₁ = ${(x1 + 1).toFixed(2)}, x₂ = ${(x2 - 1).toFixed(2)}`,
                D: `x₁ = ${(b / (2 * a)).toFixed(2)}, x₂ = ${(c / a).toFixed(2)}`
            },
            correctAnswer: 'A',
            explanation: `Gunakan rumus ABC: x = (-b ± √D) / 2a\nD = b² - 4ac = ${newD}\nx₁ = ${x1.toFixed(2)}, x₂ = ${x2.toFixed(2)}`
        };
    }

    // 2. SPLDV Generator
    generateLinearSystem2Var(difficulty) {
        const seed = Date.now();
        let a1, b1, c1, a2, b2, c2;

        if (difficulty === 'Easy') {
            a1 = this.random(1, 5, seed);
            b1 = this.random(1, 5, seed + 1);
            a2 = this.random(1, 5, seed + 2);
            b2 = this.random(1, 5, seed + 3);
        } else {
            a1 = this.random(1, 10, seed);
            b1 = this.random(1, 10, seed + 1);
            a2 = this.random(1, 10, seed + 2);
            b2 = this.random(1, 10, seed + 3);
        }

        // Generate solution first
        const x = this.random(1, 10, seed + 4);
        const y = this.random(1, 10, seed + 5);

        // Calculate c values
        c1 = a1 * x + b1 * y;
        c2 = a2 * x + b2 * y;

        return {
            question: `Tentukan nilai x dan y dari sistem persamaan:\n${a1}x + ${b1}y = ${c1}\n${a2}x + ${b2}y = ${c2}`,
            options: {
                A: `x = ${x}, y = ${y}`,
                B: `x = ${y}, y = ${x}`,
                C: `x = ${x + 1}, y = ${y - 1}`,
                D: `x = ${x - 1}, y = ${y + 1}`
            },
            correctAnswer: 'A',
            explanation: `Gunakan metode eliminasi atau substitusi.\nSolusi: x = ${x}, y = ${y}`
        };
    }

    // 3. Trigonometri Generator
    generateTrigonometry(difficulty) {
        const seed = Date.now();
        const angles = [0, 30, 45, 60, 90];
        const angle = angles[this.random(0, angles.length - 1, seed)];

        const sinValues = { 0: 0, 30: 0.5, 45: 0.707, 60: 0.866, 90: 1 };
        const cosValues = { 0: 1, 30: 0.866, 45: 0.707, 60: 0.5, 90: 0 };

        const correctSin = sinValues[angle];
        const correctCos = cosValues[angle];

        return {
            question: `Tentukan nilai sin ${angle}° + cos ${angle}°`,
            options: {
                A: `${(correctSin + correctCos).toFixed(3)}`,
                B: `${(correctSin - correctCos).toFixed(3)}`,
                C: `${(correctSin * correctCos).toFixed(3)}`,
                D: `${(correctSin / (correctCos || 1)).toFixed(3)}`
            },
            correctAnswer: 'A',
            explanation: `sin ${angle}° = ${correctSin}, cos ${angle}° = ${correctCos}\nJadi sin ${angle}° + cos ${angle}° = ${(correctSin + correctCos).toFixed(3)}`
        };
    }

    // 4. Limit Fungsi Generator
    generateLimit(difficulty) {
        const seed = Date.now();
        const a = this.random(1, 5, seed);
        const b = this.random(1, 10, seed + 1);
        const c = a * a + b; // Result of the limit as x -> a

        return {
            question: `Tentukan nilai dari lim(x→${a}) (x² + ${b})`,
            options: {
                A: `${c}`,
                B: `${c + 2}`,
                C: `${c - a}`,
                D: `${a + b}`
            },
            correctAnswer: 'A',
            explanation: `Substitusikan x = ${a} ke dalam fungsi: (${a})² + ${b} = ${a * a} + ${b} = ${c}`
        };
    }

    // 5. Barisan dan Deret (Aritmatika)
    generateSequence(difficulty) {
        const seed = Date.now();
        const a = this.random(1, 10, seed);
        const b = this.random(2, 5, seed + 1);
        const n = this.random(10, 20, seed + 2);
        const result = a + (n - 1) * b;

        return {
            question: `Diketahui barisan aritmatika dengan suku pertama (a) = ${a} dan beda (b) = ${b}. Tentukan suku ke-${n} (U${n})!`,
            options: {
                A: `${result}`,
                B: `${result + b}`,
                C: `${result - b}`,
                D: `${a + n * b}`
            },
            correctAnswer: 'A',
            explanation: `Rumus Un = a + (n-1)b\nU${n} = ${a} + (${n}-1)${b}\nU${n} = ${a} + ${n - 1}*${b} = ${result}`
        };
    }

    // 6. Matriks (Determinan 2x2)
    generateMatrix(difficulty) {
        const seed = Date.now();
        const a = this.random(1, 6, seed);
        const b = this.random(1, 6, seed + 1);
        const c = this.random(1, 6, seed + 2);
        const d = this.random(1, 6, seed + 3);
        const det = (a * d) - (b * c);

        return {
            question: `Tentukan determinan dari matriks A = [[${a}, ${b}], [${c}, ${d}]]`,
            options: {
                A: `${det}`,
                B: `${det + 5}`,
                C: `${(a * d) + (b * c)}`,
                D: `${a + b + c + d}`
            },
            correctAnswer: 'A',
            explanation: `Det(A) = (ad) - (bc)\nDet(A) = (${a}*${d}) - (${b}*${c}) = ${a * d} - ${b * c} = ${det}`
        };
    }

    // 7. Operasi Bilangan Real
    generateRealNumbers(difficulty) {
        const seed = Date.now();
        const a = this.random(10, 50, seed);
        const b = this.random(5, 20, seed + 1);
        const c = this.random(2, 10, seed + 2);
        const result = a + b * c;

        return {
            question: `Hitunglah hasil dari: ${a} + ${b} × ${c}`,
            options: {
                A: `${result}`,
                B: `${(a + b) * c}`,
                C: `${result - 10}`,
                D: `${a * b + c}`
            },
            correctAnswer: 'A',
            explanation: `Dahulukan perkalian: ${b} × ${c} = ${b * c}\nLalu jumlahkan: ${a} + ${b * c} = ${result}`
        };
    }

    // 8. Persamaan Lingkaran
    generateCircle(difficulty) {
        const seed = Date.now();
        const h = this.random(-5, 5, seed);
        const k = this.random(-5, 5, seed + 1);
        const r = this.random(2, 6, seed + 2);
        const r2 = r * r;

        const hSign = h >= 0 ? '-' : '+';
        const kSign = k >= 0 ? '-' : '+';
        const absH = Math.abs(h);
        const absK = Math.abs(k);

        return {
            question: `Tentukan persamaan lingkaran yang berpusat di (${h}, ${k}) dengan jari-jari ${r}!`,
            options: {
                A: `(x ${hSign} ${absH})² + (y ${kSign} ${absK})² = ${r2}`,
                B: `(x ${hSign === '-' ? '+' : '-'} ${absH})² + (y ${kSign === '-' ? '+' : '-'} ${absK})² = ${r2}`,
                C: `(x ${hSign} ${absH})² + (y ${kSign} ${absK})² = ${r * 2}`,
                D: `x² + y² = ${r2}`
            },
            correctAnswer: 'A',
            explanation: `Rumus: (x-h)² + (y-k)² = r²\n(x - (${h}))² + (y - (${k}))² = ${r}²\n(x ${hSign} ${absH})² + (y ${kSign} ${absK})² = ${r2}`
        };
    }

    // Helper to shuffle options so correct answer isn't always 'A'
    shuffleOptions(problem) {
        if (!problem || !problem.options) return problem;

        const optionKeys = ['A', 'B', 'C', 'D'];

        // Create array of {key, value} to track correct answer by original key, not value
        const optionsWithKeys = optionKeys.map(key => ({
            originalKey: key,
            value: problem.options[key]
        }));

        // Shuffle using Fisher-Yates
        for (let i = optionsWithKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionsWithKeys[i], optionsWithKeys[j]] = [optionsWithKeys[j], optionsWithKeys[i]];
        }

        // Find the new position of the correct answer by original key (not by value!)
        const newCorrectIdx = optionsWithKeys.findIndex(opt => opt.originalKey === problem.correctAnswer);
        const newCorrectLetter = optionKeys[newCorrectIdx];

        return {
            ...problem,
            options: {
                A: optionsWithKeys[0].value,
                B: optionsWithKeys[1].value,
                C: optionsWithKeys[2].value,
                D: optionsWithKeys[3].value
            },
            correctAnswer: newCorrectLetter
        };
    }

    // 9. SPLTV (3 Variabel)
    generateLinearSystem3Var(difficulty) {
        const seed = Date.now();
        const x = this.random(1, 4, seed);
        const y = this.random(1, 4, seed + 1);
        const z = this.random(1, 4, seed + 2);

        return {
            question: `Tentukan nilai (x, y, z) dari sistem persamaan:\n1) x + y + z = ${x + y + z}\n2) 2x + y - z = ${2 * x + y - z}\n3) x - 2y + z = ${x - 2 * y + z}`,
            options: {
                A: `x=${x}, y=${y}, z=${z}`,
                B: `x=${y}, y=${x}, z=${z}`,
                C: `x=${z}, y=${y}, z=${x}`,
                D: `x=${x + 1}, y=${y - 1}, z=${z}`
            },
            correctAnswer: 'A',
            explanation: `Gunakan metode eliminasi/substitusi.\nSubstitusi nilai: x=${x}, y=${y}, z=${z} terbukti benar untuk ketiga persamaan.`
        };
    }

    // 10. Fungsi Invers
    generateInverseFunction(difficulty) {
        const seed = Date.now();
        const a = this.random(2, 5, seed);
        const b = this.random(1, 6, seed + 1);

        return {
            question: `Jika f(x) = ${a}x + ${b}, maka tentukan f⁻¹(x)!`,
            options: {
                A: `(x - ${b}) / ${a}`,
                B: `(x + ${b}) / ${a}`,
                C: `${a}x - ${b}`,
                D: `(x - ${a}) / ${b}`
            },
            correctAnswer: 'A',
            explanation: `y = ${a}x + ${b} \n y - ${b} = ${a}x \n x = (y - ${b}) / ${a} \n f⁻¹(x) = (x - ${b}) / ${a}`
        };
    }

    // 11. Komposisi Fungsi
    generateCompositeFunction(difficulty) {
        const seed = Date.now();
        const a = this.random(2, 4, seed);
        const b = this.random(1, 5, seed + 1);
        const c = this.random(2, 4, seed + 2);

        return {
            question: `Diketahui f(x) = ${a}x + ${b} dan g(x) = ${c}x. Tentukan (f ∘ g)(x)!`,
            options: {
                A: `${a * c}x + ${b}`,
                B: `${a + c}x + ${b}`,
                C: `${a * c}x + ${b * c}`,
                D: `${a}x + ${b + c}`
            },
            correctAnswer: 'A',
            explanation: `(f ∘ g)(x) = f(g(x)) \n = f(${c}x) \n = ${a}(${c}x) + ${b} \n = ${a * c}x + ${b}`
        };
    }

    // 12. Peluang
    generateProbability(difficulty) {
        const seed = Date.now();
        const merah = this.random(3, 7, seed);
        const biru = this.random(3, 7, seed + 1);
        const total = merah + biru;

        return {
            question: `Dalam sebuah kantong terdapat ${merah} bola merah dan ${biru} bola biru. Berapa peluang terambilnya 1 bola merah?`,
            options: {
                A: `${merah}/${total}`,
                B: `${biru}/${total}`,
                C: `1/${total}`,
                D: `${merah}/${biru}`
            },
            correctAnswer: 'A',
            explanation: `Peluang = (Jumlah Kejadian) / (Total Ruang Sampel) \n P = ${merah} / (${merah} + ${biru}) = ${merah}/${total}`
        };
    }

    // 13. Statistika
    generateStatistics(difficulty) {
        const seed = Date.now();
        const data = [
            this.random(60, 70, seed),
            this.random(70, 80, seed + 1),
            this.random(80, 90, seed + 2),
            this.random(90, 100, seed + 3)
        ];
        const mean = (data[0] + data[1] + data[2] + data[3]) / 4;

        return {
            question: `Berapakah nilai rata-rata (mean) dari data berikut: ${data.join(', ')}?`,
            options: {
                A: `${mean}`,
                B: `${mean + 2}`,
                C: `${mean - 2}`,
                D: `${Math.round(mean)}`
            },
            correctAnswer: 'A',
            explanation: `Rata-rata = (Jumlah Data) / (Banyak Data) \n (${data.join(' + ')}) / 4 = ${mean}`
        };
    }

    // 14. Diferensial (Turunan)
    generateDifferential(difficulty) {
        const seed = Date.now();
        const a = this.random(2, 9, seed);
        const n = this.random(2, 5, seed + 1);

        return {
            question: `Tentukan turunan pertama f'(x) dari f(x) = ${a}x${this.toSuperscript(n)}!`,
            options: {
                A: `${a * n}x${n - 1 === 1 ? '' : this.toSuperscript(n - 1)}`,
                B: `${a}x${n - 1 === 1 ? '' : this.toSuperscript(n - 1)}`,
                C: `${a * n}x${this.toSuperscript(n)}`,
                D: `${a + n}x${this.toSuperscript(n - 1)}`
            },
            correctAnswer: 'A',
            explanation: `Rumus f'(x) = n · a · xⁿ⁻¹ \n f'(x) = ${n} · ${a} · x${this.toSuperscript(n - 1)} = ${a * n}x${n - 1 === 1 ? '' : this.toSuperscript(n - 1)}`
        };
    }

    // 15. Integral
    generateIntegral(difficulty) {
        const seed = Date.now();
        const n = this.random(2, 4, seed);
        const a = n + 1; // Untuk hasil yang bulat: a / (n+1)

        return {
            question: `Tentukan hasil dari ∫ ${a}x${this.toSuperscript(n)} dx!`,
            options: {
                A: `x${this.toSuperscript(n + 1)} + C`,
                B: `${a}x${this.toSuperscript(n + 1)} + C`,
                C: `1/${a} x${this.toSuperscript(n + 1)} + C`,
                D: `x${this.toSuperscript(n)} + C`
            },
            correctAnswer: 'A',
            explanation: `Rumus ∫ axⁿ dx = (a / n+1)xⁿ⁺¹ + C \n = (${a} / ${n}+1)x${this.toSuperscript(n + 1)} + C = x${this.toSuperscript(n + 1)} + C`
        };
    }

    // Helper for Superscript
    toSuperscript(num) {
        const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
        return String(num).split('').map(c => map[c] || c).join('');
    }

    // Fallback generator (simple template)
    generateFallback(topic, difficulty) {
        return {
            question: `Soal ${topic} (${difficulty}) - Template belum tersedia`,
            options: {
                A: 'Jawaban A',
                B: 'Jawaban B',
                C: 'Jawaban C',
                D: 'Jawaban D'
            },
            correctAnswer: 'A',
            explanation: 'Template untuk topik ini sedang dalam pengembangan.'
        };
    }
}

module.exports = new ProblemGenerator();
