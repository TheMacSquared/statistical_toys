/**
 * visualizer.js - Wizualizacja przedziałów ufności za pomocą D3.js
 */

const CIVisualizer = {
    svg: null,
    width: 0,
    height: 200,
    margin: { top: 20, right: 60, bottom: 40, left: 80 },  // Zwiększone marginesy

    /**
     * Inicjalizacja SVG
     */
    init() {
        this.svg = d3.select('#ci-visualization');
        this.updateDimensions();

        // Responsywność
        window.addEventListener('resize', () => {
            this.updateDimensions();
        });
    },

    updateDimensions() {
        const container = document.querySelector('.visualization-container');
        if (container) {
            // Szerokość = pełna szerokość kontenera (padding jest w CSS)
            this.width = container.clientWidth;
            if (this.width < 400) this.width = 400; // Minimalna szerokość
            this.svg.attr('width', this.width).attr('height', this.height);
        }
    },

    /**
     * Główna funkcja rysowania
     */
    draw(modeId, questionData, isAnswered, isCorrect) {
        // Wyczyść poprzednią wizualizację
        this.svg.selectAll('*').remove();

        if (modeId === 'single_interval') {
            this.drawSingleInterval(questionData, isAnswered, isCorrect);
        } else if (modeId === 'two_intervals') {
            this.drawTwoIntervals(questionData, isAnswered, isCorrect);
        }
    },

    /**
     * Tryb 1: Pojedynczy przedział vs wartość
     */
    drawSingleInterval(data, isAnswered, isCorrect) {
        const { ci_lower, ci_upper, tested_value, unit, comparison } = data;

        // Oblicz zakres osi X - rozszerzony aby pokazać przedział testowany
        const padding = (ci_upper - ci_lower) * 0.5;
        const xMin = Math.min(ci_lower, tested_value) - padding;
        const xMax = Math.max(ci_upper, tested_value) + padding;

        // Skala X
        const xScale = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([this.margin.left, this.width - this.margin.right]);

        // Oś X
        const xAxis = d3.axisBottom(xScale)
            .ticks(8)
            .tickFormat(d => d + (unit ? '' : ''));

        const g = this.svg.append('g');

        // Rysuj oś X
        g.append('g')
            .attr('transform', `translate(0, ${this.height - this.margin.bottom})`)
            .call(xAxis)
            .style('font-size', '12px');

        // Etykieta osi X
        if (unit) {
            g.append('text')
                .attr('x', this.width / 2)
                .attr('y', this.height - 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('fill', '#666')
                .text(`Wartość (${unit})`);
        }

        const yCenter = this.height / 2 - 10;

        // Kolor przedziału CI
        let ciColor = '#4A90E2';  // niebieski domyślnie
        if (isAnswered) {
            if (isCorrect) {
                ciColor = '#27AE60';  // zielony jeśli poprawna odpowiedź
            } else {
                ciColor = '#E74C3C';  // czerwony jeśli błędna
            }
        }

        // Rysuj przedział CI jako prostokąt
        g.append('rect')
            .attr('x', xScale(ci_lower))
            .attr('y', yCenter - 15)
            .attr('width', xScale(ci_upper) - xScale(ci_lower))
            .attr('height', 30)
            .attr('fill', ciColor)
            .attr('opacity', 0.3)
            .attr('stroke', ciColor)
            .attr('stroke-width', 2)
            .attr('rx', 3);

        // Etykieta przedziału CI
        g.append('text')
            .attr('x', (xScale(ci_lower) + xScale(ci_upper)) / 2)
            .attr('y', yCenter - 25)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', ciColor)
            .text(`CI 95%: [${ci_lower}; ${ci_upper}]`);

        // Rysuj testowany PRZEDZIAŁ (nie punkt)
        // Np. "przekracza 20" to przedział [20, ∞), "mniejsza niż 20" to (-∞, 20]
        // Przed odpowiedzią: pomarańczowy (neutralny), po: czerwony
        const valueColor = isAnswered ? '#E74C3C' : '#F39C12';

        // Określ kierunek przedziału
        const isGreater = comparison === 'greater'; // > (w prawo)
        const isLess = comparison === 'less';       // < (w lewo)

        // Rysuj przedział jako prostokąt + strzałkę
        const rectY = yCenter + 20;
        const rectHeight = 25;

        if (isGreater) {
            // Przedział [tested_value, →)
            const rectX = xScale(tested_value);
            const rectWidth = xScale(xMax) - rectX;

            g.append('rect')
                .attr('x', rectX)
                .attr('y', rectY)
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .attr('fill', valueColor)
                .attr('opacity', 0.15)
                .attr('stroke', valueColor)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,3');

            // Strzałka w prawo
            g.append('polygon')
                .attr('points', `${xScale(xMax)-10},${rectY+rectHeight/2-6} ${xScale(xMax)},${rectY+rectHeight/2} ${xScale(xMax)-10},${rectY+rectHeight/2+6}`)
                .attr('fill', valueColor);

            // Linia pionowa na początku przedziału
            g.append('line')
                .attr('x1', rectX)
                .attr('x2', rectX)
                .attr('y1', rectY)
                .attr('y2', rectY + rectHeight)
                .attr('stroke', valueColor)
                .attr('stroke-width', 3);

            // Etykieta
            g.append('text')
                .attr('x', (rectX + xScale(xMax)) / 2)
                .attr('y', rectY + rectHeight + 15)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('fill', valueColor)
                .text(`Pytanie: > ${tested_value}`);
        } else if (isLess) {
            // Przedział (←, tested_value]
            const rectX = xScale(xMin);
            const rectWidth = xScale(tested_value) - rectX;

            g.append('rect')
                .attr('x', rectX)
                .attr('y', rectY)
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .attr('fill', valueColor)
                .attr('opacity', 0.15)
                .attr('stroke', valueColor)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,3');

            // Strzałka w lewo
            g.append('polygon')
                .attr('points', `${xScale(xMin)+10},${rectY+rectHeight/2-6} ${xScale(xMin)},${rectY+rectHeight/2} ${xScale(xMin)+10},${rectY+rectHeight/2+6}`)
                .attr('fill', valueColor);

            // Linia pionowa na końcu przedziału
            g.append('line')
                .attr('x1', xScale(tested_value))
                .attr('x2', xScale(tested_value))
                .attr('y1', rectY)
                .attr('y2', rectY + rectHeight)
                .attr('stroke', valueColor)
                .attr('stroke-width', 3);

            // Etykieta
            g.append('text')
                .attr('x', (rectX + xScale(tested_value)) / 2)
                .attr('y', rectY + rectHeight + 15)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('fill', valueColor)
                .text(`Pytanie: < ${tested_value}`);
        }

        // Podświetlenie już jest - przedział testowany zmienia kolor na czerwony po odpowiedzi
    },

    /**
     * Tryb 2: Porównanie dwóch przedziałów
     */
    drawTwoIntervals(data, isAnswered, isCorrect) {
        const { ci1_lower, ci1_upper, ci1_label, ci2_lower, ci2_upper, ci2_label, unit } = data;

        // Oblicz zakres osi X
        const allValues = [ci1_lower, ci1_upper, ci2_lower, ci2_upper];
        const xMin = Math.min(...allValues) - 5;
        const xMax = Math.max(...allValues) + 5;

        // Skala X
        const xScale = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([this.margin.left, this.width - this.margin.right]);

        // Oś X
        const xAxis = d3.axisBottom(xScale)
            .ticks(8)
            .tickFormat(d => d + (unit ? '' : ''));

        const g = this.svg.append('g');

        // Rysuj oś X
        g.append('g')
            .attr('transform', `translate(0, ${this.height - this.margin.bottom})`)
            .call(xAxis)
            .style('font-size', '12px');

        // Etykieta osi X
        if (unit) {
            g.append('text')
                .attr('x', this.width / 2)
                .attr('y', this.height - 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('fill', '#666')
                .text(`Wartość (${unit})`);
        }

        const y1 = 60;  // Pozycja Y dla pierwszego przedziału
        const y2 = 120; // Pozycja Y dla drugiego przedziału

        // Kolory przedziałów
        let ci1Color = '#4A90E2';  // niebieski
        let ci2Color = '#F39C12';  // pomarańczowy

        if (isAnswered) {
            if (isCorrect) {
                ci1Color = '#27AE60';  // zielony
                ci2Color = '#27AE60';
            } else {
                ci1Color = '#E74C3C';  // czerwony
                ci2Color = '#E74C3C';
            }
        }

        // Rysuj przedział CI 1
        g.append('rect')
            .attr('x', xScale(ci1_lower))
            .attr('y', y1 - 10)
            .attr('width', xScale(ci1_upper) - xScale(ci1_lower))
            .attr('height', 20)
            .attr('fill', ci1Color)
            .attr('opacity', 0.3)
            .attr('stroke', ci1Color)
            .attr('stroke-width', 2)
            .attr('rx', 3);

        // Etykieta CI 1
        g.append('text')
            .attr('x', this.margin.left - 10)
            .attr('y', y1 + 5)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', ci1Color)
            .text(`${ci1_label}:`);

        g.append('text')
            .attr('x', (xScale(ci1_lower) + xScale(ci1_upper)) / 2)
            .attr('y', y1 - 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', ci1Color)
            .text(`[${ci1_lower}; ${ci1_upper}]`);

        // Rysuj przedział CI 2
        g.append('rect')
            .attr('x', xScale(ci2_lower))
            .attr('y', y2 - 10)
            .attr('width', xScale(ci2_upper) - xScale(ci2_lower))
            .attr('height', 20)
            .attr('fill', ci2Color)
            .attr('opacity', 0.3)
            .attr('stroke', ci2Color)
            .attr('stroke-width', 2)
            .attr('rx', 3);

        // Etykieta CI 2
        g.append('text')
            .attr('x', this.margin.left - 10)
            .attr('y', y2 + 5)
            .attr('text-anchor', 'end')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', ci2Color)
            .text(`${ci2_label}:`);

        g.append('text')
            .attr('x', (xScale(ci2_lower) + xScale(ci2_upper)) / 2)
            .attr('y', y2 - 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', ci2Color)
            .text(`[${ci2_lower}; ${ci2_upper}]`);

        // Podświetl nakładanie się (po odpowiedzi)
        if (isAnswered) {
            this.highlightOverlap(g, xScale, y1, y2, ci1_lower, ci1_upper, ci2_lower, ci2_upper, isCorrect);
        }
    },

    /**
     * Podświetl obszar decyzyjny (tryb 1)
     */
    highlightDecisionRegion(g, xScale, yCenter, ciLower, ciUpper, testedValue, isCorrect) {
        // Sprawdź czy wartość jest poza przedziałem
        if (testedValue < ciLower || testedValue > ciUpper) {
            // Wartość poza przedziałem - można wnioskować
            const highlightColor = isCorrect ? '#27AE60' : '#F1C40F';

            if (testedValue < ciLower) {
                // Podświetl obszar po lewej stronie
                g.append('rect')
                    .attr('x', xScale.range()[0])
                    .attr('y', yCenter - 15)
                    .attr('width', xScale(ciLower) - xScale.range()[0])
                    .attr('height', 30)
                    .attr('fill', highlightColor)
                    .attr('opacity', 0.1);
            } else {
                // Podświetl obszar po prawej stronie
                g.append('rect')
                    .attr('x', xScale(ciUpper))
                    .attr('y', yCenter - 15)
                    .attr('width', xScale.range()[1] - xScale(ciUpper))
                    .attr('height', 30)
                    .attr('fill', highlightColor)
                    .attr('opacity', 0.1);
            }
        } else {
            // Wartość wewnątrz przedziału - nie można wnioskować
            const highlightColor = isCorrect ? '#F1C40F' : '#E74C3C';

            g.append('rect')
                .attr('x', xScale(ciLower))
                .attr('y', yCenter - 15)
                .attr('width', xScale(ciUpper) - xScale(ciLower))
                .attr('height', 30)
                .attr('fill', highlightColor)
                .attr('opacity', 0.15)
                .attr('stroke', highlightColor)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3,3');
        }
    },

    /**
     * Podświetl nakładanie się przedziałów (tryb 2)
     */
    highlightOverlap(g, xScale, y1, y2, ci1Lower, ci1Upper, ci2Lower, ci2Upper, isCorrect) {
        // Oblicz część wspólną (overlap)
        const overlapLower = Math.max(ci1Lower, ci2Lower);
        const overlapUpper = Math.min(ci1Upper, ci2Upper);

        if (overlapLower < overlapUpper) {
            // Przedziały się nakładają
            const highlightColor = isCorrect ? '#F1C40F' : '#E74C3C';

            // Podświetl obszar nakładania
            g.append('rect')
                .attr('x', xScale(overlapLower))
                .attr('y', y1 - 10)
                .attr('width', xScale(overlapUpper) - xScale(overlapLower))
                .attr('height', (y2 + 10) - (y1 - 10))
                .attr('fill', highlightColor)
                .attr('opacity', 0.2)
                .attr('stroke', highlightColor)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5');

            // Etykieta nakładania
            g.append('text')
                .attr('x', (xScale(overlapLower) + xScale(overlapUpper)) / 2)
                .attr('y', (y1 + y2) / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .style('fill', highlightColor)
                .text('↕ Nakładają się');
        } else {
            // Przedziały są rozdzielone
            const highlightColor = isCorrect ? '#27AE60' : '#E74C3C';

            // Podświetl odstęp między przedziałami
            if (ci1Upper < ci2Lower) {
                // CI1 jest po lewej od CI2
                g.append('line')
                    .attr('x1', xScale(ci1Upper))
                    .attr('x2', xScale(ci2Lower))
                    .attr('y1', (y1 + y2) / 2)
                    .attr('y2', (y1 + y2) / 2)
                    .attr('stroke', highlightColor)
                    .attr('stroke-width', 3)
                    .attr('stroke-dasharray', '3,3');

                g.append('text')
                    .attr('x', (xScale(ci1Upper) + xScale(ci2Lower)) / 2)
                    .attr('y', (y1 + y2) / 2 - 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .style('font-weight', 'bold')
                    .style('fill', highlightColor)
                    .text('Rozdzielone');
            } else {
                // CI2 jest po lewej od CI1
                g.append('line')
                    .attr('x1', xScale(ci2Upper))
                    .attr('x2', xScale(ci1Lower))
                    .attr('y1', (y1 + y2) / 2)
                    .attr('y2', (y1 + y2) / 2)
                    .attr('stroke', highlightColor)
                    .attr('stroke-width', 3)
                    .attr('stroke-dasharray', '3,3');

                g.append('text')
                    .attr('x', (xScale(ci2Upper) + xScale(ci1Lower)) / 2)
                    .attr('y', (y1 + y2) / 2 - 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '10px')
                    .style('font-weight', 'bold')
                    .style('fill', highlightColor)
                    .text('Rozdzielone');
            }
        }
    }
};

// Inicjalizuj po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    CIVisualizer.init();
});
