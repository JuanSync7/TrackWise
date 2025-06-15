import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button'; // Import Button if used in actions

// Mock lucide-react icons used in actions if any
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  PlusCircle: () => <svg data-testid="plus-circle-icon" />,
}));


describe('PageHeader', () => {
  it('renders the title correctly', () => {
    render(<PageHeader title="Test Title" />);
    expect(screen.getByRole('heading', { name: /test title/i })).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<PageHeader title="Test Title" description="Test Description" />);
    expect(screen.getByText(/test description/i)).toBeInTheDocument();
  });

  it('does not render the description when not provided', () => {
    render(<PageHeader title="Test Title" />);
    expect(screen.queryByText(/test description/i)).not.toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    const actions = <Button>Action Button</Button>;
    render(<PageHeader title="Test Title" actions={actions} />);
    expect(screen.getByRole('button', { name: /action button/i })).toBeInTheDocument();
  });

  it('does not render actions when not provided', () => {
    render(<PageHeader title="Test Title" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
