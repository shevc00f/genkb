/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {GoogleGenAI} from '@google/genai';

type AuthType = 'apikey' | 'login';

interface AIProvider {
  id: string;
  name: string;
  authType: AuthType;
}

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
  generatedTopic = signal<string>('');

  // AI Provider state
  providers: AIProvider[] = [
    { id: 'gemini', name: 'Gemini', authType: 'apikey' },
    { id: 'grok', name: 'GROK', authType: 'apikey' },
    { id: 'deepsik', name: 'DeepSeek', authType: 'login' },
    { id: 'qwen', name: 'Qwen', authType: 'apikey' },
    { id: 'other', name: 'Другая модель', authType: 'login' },
  ];
  selectedProviderId = signal<string>(this.providers[0].id);
  selectedProvider = computed(() => 
    this.providers.find(p => p.id === this.selectedProviderId())!
  );
  apiKey = signal<string>('');
  username = signal<string>('');
  password = signal<string>('');


  async generateSafetyContact(): Promise<void> {
    if (!this.topic().trim()) {
      this.error.set('Пожалуйста, введите тему для генерации.');
      return;
    }

    const provider = this.selectedProvider();
    if (provider.authType === 'apikey' && !this.apiKey().trim()) {
        this.error.set(`Пожалуйста, введите API ключ для ${provider.name}.`);
        return;
    }
    if (provider.authType === 'login' && (!this.username().trim() || !this.password().trim())) {
        this.error.set(`Пожалуйста, введите логин и пароль для ${provider.name}.`);
        return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.safetyContact.set(null);

    try {
      const providerId = this.selectedProviderId();
      let generatedText: string;

      switch(providerId) {
        case 'gemini':
          generatedText = await this.generateWithGemini();
          break;
        case 'grok':
        case 'deepsik':
        case 'qwen':
        case 'other':
          generatedText = await this.generateWithMock(provider.name);
          break;
        default:
          throw new Error('Неизвестный провайдер');
      }
      
      this.safetyContact.set(generatedText);
      this.generatedTopic.set(this.topic());
    } catch (e) {
      console.error(e);
      this.error.set(
        'Не удалось сгенерировать контакт по безопасности. Пожалуйста, проверьте консоль для получения дополнительной информации.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async generateWithGemini(): Promise<string> {
    const apiKey = this.apiKey();
    if (!apiKey) {
      // This case should be caught by the initial validation, but it's good practice
      throw new Error('Ключ API для Gemini не предоставлен.');
    }

    const ai = new GoogleGenAI({apiKey: apiKey});
      
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

    return response.text;
  }
  
  private async generateWithMock(providerName: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    const mockStory = `История от ${providerName} на тему "${this.topic()}"
Однажды опытный сотрудник решил "на минуточку" обойти стандартную процедуру безопасности, будучи уверенным в своем опыте. Он считал, что так сэкономит время. К сожалению, именно в этот момент произошло непредвиденное событие, которое привело к небольшому инциденту. К счастью, никто серьезно не пострадал, но оборудование было повреждено.

Выводы и извлеченные уроки:
1.  **Процедуры существуют для всех**: Независимо от опыта, правила безопасности написаны для того, чтобы защищать. Их нельзя игнорировать.
2.  **Риск не оправдан**: Экономия нескольких минут не стоит потенциального вреда для здоровья или дорогостоящего ремонта.
3.  **Сообщайте об отклонениях**: Если вы видите, что кто-то нарушает правила, вежливо напомните ему о важности безопасности.
    `;
    
    return `[Это демонстрационный ответ, сгенерированный с использованием ${providerName}]

---

${mockStory}`;
  }


  saveAsTxt(): void {
    const content = this.safetyContact();
    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    this.triggerDownload(blob, 'kb.txt');
  }

  saveAsHtml(): void {
    const content = this.safetyContact();
    if (!content) return;

    const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Контакт по Безопасности</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    h1 {
      color: #0d9488; /* tailwind teal-600 */
      border-bottom: 2px solid #e5e7eb; /* tailwind gray-200 */
      padding-bottom: 0.5rem;
    }
    div {
      white-space: pre-wrap;
      word-wrap: break-word;
      background-color: #f9fafb; /* tailwind gray-50 */
      border: 1px solid #e5e7eb; /* tailwind gray-200 */
      padding: 1rem;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <h1>Контакт по Безопасности: ${this.generatedTopic() || 'Общая тема'}</h1>
  <div>${content}</div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    this.triggerDownload(blob, 'kb.html');
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
