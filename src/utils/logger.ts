/**
 * Logger utility for consistent terminal output
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';

export class Logger {
  private spinner?: Ora;
  private silent: boolean;

  constructor(silent = false) {
    this.silent = silent;
  }

  /**
   * Log info message
   */
  info(message: string): void {
    if (this.silent) return;
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Log success message
   */
  success(message: string): void {
    if (this.silent) return;
    console.log(chalk.green('✓'), message);
  }

  /**
   * Log error message
   */
  error(message: string): void {
    if (this.silent) return;
    console.error(chalk.red('✗'), message);
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    if (this.silent) return;
    console.warn(chalk.yellow('⚠'), message);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string): void {
    if (this.silent) return;
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(chalk.gray('›'), message);
    }
  }

  /**
   * Log raw message without prefix
   */
  raw(message: string): void {
    if (this.silent) return;
    console.log(message);
  }

  /**
   * Log empty line
   */
  newline(): void {
    if (this.silent) return;
    console.log('');
  }

  /**
   * Start a loading spinner
   */
  startSpinner(message: string): void {
    if (this.silent) return;
    this.spinner = ora({
      text: message,
      color: 'cyan',
      spinner: 'dots',
    }).start();
  }

  /**
   * Update spinner text
   */
  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Stop spinner with success
   */
  succeedSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = undefined;
    }
  }

  /**
   * Stop spinner with failure
   */
  failSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = undefined;
    }
  }

  /**
   * Stop spinner with info
   */
  infoSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.info(message);
      this.spinner = undefined;
    }
  }

  /**
   * Stop spinner without message
   */
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
  }

  /**
   * Create a table for aligned output
   */
  table(headers: string[], rows: string[][]): void {
    if (this.silent) return;

    // Calculate column widths
    const colWidths = headers.map((h, i) => {
      const maxWidth = Math.max(
        h.length,
        ...rows.map((row) => (row[i] || '').length)
      );
      return maxWidth + 2;
    });

    // Print header
    const headerRow = headers
      .map((h, i) => chalk.bold(h.padEnd(colWidths[i])))
      .join('');
    console.log(headerRow);

    // Print separator
    const separator = colWidths.map((w) => '─'.repeat(w - 1) + ' ').join('');
    console.log(chalk.gray(separator));

    // Print rows
    for (const row of rows) {
      const rowStr = row
        .map((cell, i) => (cell || '').padEnd(colWidths[i]))
        .join('');
      console.log(rowStr);
    }
  }

  /**
   * Create a progress bar
   */
  progress(current: number, total: number, width = 30): string {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    return `${bar} ${percentage}%`;
  }

  /**
   * Format file size for display
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format duration for display
   */
  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }

  /**
   * Set silent mode
   */
  setSilent(silent: boolean): void {
    this.silent = silent;
  }

  /**
   * Get current silent state
   */
  isSilent(): boolean {
    return this.silent;
  }
}

// Export singleton instance
export const logger = new Logger();
