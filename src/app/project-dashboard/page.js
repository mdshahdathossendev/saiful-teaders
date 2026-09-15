'use client';

import './dashboard.css';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDashboard } from '@/hooks/useDashboard';
import CustomerListPanel from '@/components/dashboard/CustomerListPanel';
import CustomerSummaryCards from '@/components/dashboard/CustomerSummaryCards';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import GlobalSummaryCards from '@/components/dashboard/GlobalSummaryCards';
import LoginPanel from '@/components/dashboard/LoginPanel';
import SalesForm from '@/components/dashboard/SalesForm';
import AddCustomerModal from '@/components/dashboard/modals/AddCustomerModal';
import AddSuccessModal from '@/components/dashboard/modals/AddSuccessModal';
import DeleteCustomerModal from '@/components/dashboard/modals/DeleteCustomerModal';
import DepositModal from '@/components/dashboard/modals/DepositModal';
import DepositSuccessModal from '@/components/dashboard/modals/DepositSuccessModal';
import SlipModal from '@/components/dashboard/modals/SlipModal';
import PreviousDueModal from '@/components/dashboard/modals/PreviousDueModal';

export default function ProjectDashboardPage() {
  const db = useDashboard();

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!db.isLoggedIn) {
    return (
      <LoginPanel
        username={db.username}
        setUsername={db.setUsername}
        password={db.password}
        setPassword={db.setPassword}
        error={db.error}
        isFetchingData={db.isFetchingData}
        onLogin={db.handleLogin}
      />
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-shell">
      {db.isFetchingData && (
        <div className="spinner-overlay">
          <LoadingSpinner />
        </div>
      )}

      <DashboardHeader
        pollingEnabled={db.pollingEnabled}
        setPollingEnabled={db.setPollingEnabled}
        lastSyncedAt={db.lastSyncedAt}
        isLoadingGlobalSummary={db.isLoadingGlobalSummary}
        onRefresh={() => db.refreshAllNow(false)}
        onLogout={db.handleLogout}
      />

      <GlobalSummaryCards globalSummary={db.globalSummary} />

      <CustomerSummaryCards form={db.form} />

      <CustomerListPanel
        form={db.form}
        customerOptions={db.customerOptions}
        filteredCustomerOptions={db.filteredCustomerOptions}
        selectedCustomerObj={db.selectedCustomerObj}
        customerSearch={db.customerSearch}
        setCustomerSearch={db.setCustomerSearch}
        onSelectCustomer={db.handleSelectCustomer}
        onOpenSheet={db.handleOpenSelectedSheet}
        onAddCustomer={db.handleAddCustomer}
        onDeleteCustomer={db.handleDeleteCustomer}
        onOpenDepositModal={() => { db.setDepositAmount(''); db.setShowDepositModal(true); }}
        onOpenPreviousDueModal={() => { db.setPreviousDueAmount(''); db.setError(''); db.setShowPreviousDueModal(true); }}
      />

      <SalesForm
        form={db.form}
        setForm={db.setForm}
        feetMode={db.feetMode}
        customerOptions={db.customerOptions}
        selectedCustomerObj={db.selectedCustomerObj}
        error={db.error}
        status={db.status}
        isSubmitting={db.isSubmitting}
        onNumberInput={db.handleNumberInput}
        onFeetModeChange={db.handleFeetModeChange}
        onSelectCustomer={db.handleSelectCustomer}
        onSubmit={db.handleSubmit}
      />

      {/* ── Modals ── */}
      {db.showAddModal && (
        <AddCustomerModal
          newCustomerForm={db.newCustomerForm}
          setNewCustomerForm={db.setNewCustomerForm}
          onConfirm={db.handleConfirmAddCustomer}
          onClose={() => db.setShowAddModal(false)}
        />
      )}

      {db.showDeleteModal && (
        <DeleteCustomerModal
          customerName={db.form.customer}
          onConfirm={db.handleConfirmDeleteCustomer}
          onClose={() => db.setShowDeleteModal(false)}
        />
      )}

      {db.showAddSuccessModal && (
        <AddSuccessModal
          customerName={db.addedCustomerName}
          onClose={() => db.setShowAddSuccessModal(false)}
        />
      )}

      {db.showDepositModal && (
        <DepositModal
          customerName={db.form.customer}
          depositAmount={db.depositAmount}
          setDepositAmount={db.setDepositAmount}
          error={db.error}
          status={db.status}
          isSubmitting={db.isSubmitting}
          onConfirm={db.handleDepositOnly}
          onClose={() => { db.setShowDepositModal(false); db.setError(''); db.setStatus(''); }}
        />
      )}

      {db.showDepositSuccess && (
        <DepositSuccessModal
          customerName={db.form.customer}
          amount={db.depositSuccessAmount}
          onClose={() => db.setShowDepositSuccess(false)}
        />
      )}

      {db.showPreviousDueModal && (
        <PreviousDueModal
          customerName={db.form.customer}
          previousDueAmount={db.previousDueAmount}
          setPreviousDueAmount={db.setPreviousDueAmount}
          error={db.error}
          status={db.status}
          isSubmitting={db.isSubmitting}
          onConfirm={db.handleAddPreviousDue}
          onClose={() => { db.setShowPreviousDueModal(false); db.setError(''); db.setStatus(''); }}
        />
      )}

      {db.showPreviousDueSuccess && (
        <DepositSuccessModal
          customerName={db.form.customer}
          amount={db.previousDueSuccessAmount}
          title="পাওয়ানা যোগ হয়েছে!"
          subText="এর হিসাবে আগের পাওয়ানা যোগ হয়েছে"
          onClose={() => db.setShowPreviousDueSuccess(false)}
        />
      )}

      {db.showSlipModal && (
        <SlipModal
          challanNo={db.lastSlip?.challanNo}
          onDownload={() => { db.handleDownloadSlip(); db.setShowSlipModal(false); db.setLastSlip(null); }}
          onClose={() => { db.setShowSlipModal(false); db.setLastSlip(null); }}
        />
      )}
    </div>
  );
}
