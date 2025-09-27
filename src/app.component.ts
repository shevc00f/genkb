/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import {GoogleGenAI} from '@google/genai';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'flex items-center justify-center min-h-screen p-4',
  },
})
export class AppComponent {
  safetyContact = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  topic = signal<string>('');

  async generateSafetyContact(): Promise<void> {
    if (!this.topic().trim()) {
      this.error.set('Пожалуйста, введите тему для генерации.');
      return;
    }

    if (!process.env.API_KEY) {
      this.error.set(
        'Ключ API не настроен. Пожалуйста, установите переменную окружения API_KEY.',
      );
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.safetyContact.set(null);

    try {
      const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
      
      const prompt = `
        Сгенерируй "Контакт по безопасности" на русском языке на следующую тему: "${this.topic()}".

        Строго следуй этим правилам:
        1. Текст должен быть на русском языке.
        2. Формат должен быть в виде короткого, увлекательного рассказа или сценария, который можно рассказать менее чем за 5 минут (примерно 250-300 слов).
        3. Начни с жизненной ситуации, связанной с темой. История может быть о событии на производстве, в офисе, дома или в быту, но она всегда должна быть связана с безопасностью на рабочем месте.
        4. После рассказа ОБЯЗАТЕЛЬНО включи раздел "Выводы и извлеченные уроки".
        5. В этом разделе четко изложи ключевые выводы и практические советы для предотвращения подобных инцидентов.
        6. Тон должен быть серьезным, но ободряющим, подчеркивающим важность безопасности для каждого.
        7. Текст не должен звучать как формальная инструкция или плановый инструктаж. Это должна быть поучительная история.
        8. Цель — проинформировать коллег о потенциальных рисках и обсудить меры профилактики.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      this.safetyContact.set(response.text);
    } catch (e) {
      console.error(e);
      this.error.set(
        'Не удалось сгенерировать контакт по безопасности. Пожалуйста, проверьте консоль для получения дополнительной информации.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}